let firebaseAuthTransitionId = 0;
let firebaseProviderAuthPending = false;
let firebaseDeferredAuthUser = null;
let firebaseProfileCompletionActive = false;

function initializeFirebaseIntegration() {
  if (!window.firebase?.initializeApp || !window.firebase?.auth || !window.firebase?.database) {
    setFirebaseSyncStatus("error", "Firebase indisponível. Seus dados continuam salvos neste dispositivo.");
    return;
  }

  try {
    firebaseApp = window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(FIREBASE_CONFIG);
    firebaseAuth = window.firebase.auth(firebaseApp);
    firebaseDatabase = window.firebase.database(firebaseApp);
    document.documentElement.dataset.firebaseReady = "true";

    firebaseAuth
      .setPersistence(window.firebase.auth.Auth.Persistence.LOCAL)
      .catch((error) => console.warn("Não foi possível manter a sessão do Firebase.", error));

    firebaseAuth.onAuthStateChanged((authUser) => {
      if (firebaseProviderAuthPending) {
        firebaseDeferredAuthUser = authUser;
        return;
      }
      void handleFirebaseAuthState(authUser).catch((error) => {
        console.error("Falha ao processar a sessão do Firebase.", error);
        setFirebaseSyncStatus("error", formatFirebaseAuthError(error));
      });
    });

    window.addEventListener("online", () => {
      if (!firebaseAuthUser) return;
      setFirebaseSyncStatus("pending", "Conexão restaurada. Preparando sincronização.");
      scheduleFirebaseSync(150);
    });
    window.addEventListener("offline", () => {
      if (firebaseAuthUser) setFirebaseSyncStatus("offline", "Sem internet. As alterações continuam salvas neste dispositivo.");
    });
  } catch (error) {
    console.error("Falha ao iniciar o Firebase.", error);
    document.documentElement.dataset.firebaseReady = "false";
    setFirebaseSyncStatus("error", "Não foi possível conectar à nuvem. Seus dados locais foram preservados.");
  }
}

async function handleFirebaseAuthState(authUser, { profileReady = false } = {}) {
  const transitionId = ++firebaseAuthTransitionId;
  firebaseAuthResolved = true;
  firebaseCloudReady = false;
  clearTimeout(firebaseSyncTimer);
  firebaseSyncTimer = 0;

  if (!authUser) {
    const localUser = getCurrentUser();
    firebaseAuthUser = null;
    firebaseProfileCompletionActive = false;
    firebaseSyncInFlight = null;
    firebaseSyncQueued = false;
    setFirebaseSyncStatus("offline", localUser
      ? "Conta local ativa. Conecte-a para sincronizar entre dispositivos."
      : "Entre para sincronizar seus dados entre dispositivos.");
    if (localUser?.cloudAccount) clearCurrentSessionLocally();
    renderSettingsIfOpen();
    return;
  }

  let resolvedProfile = firebasePendingProfile;
  if (!profileReady || !isFirebaseAccountProfileComplete(resolvedProfile)) {
    resolvedProfile = await findFirebaseCompletedProfile(authUser, resolvedProfile);
  }
  if (transitionId !== firebaseAuthTransitionId) return;

  if (!isFirebaseAccountProfileComplete(resolvedProfile)) {
    firebaseAuthUser = authUser;
    firebasePendingProfile = null;
    firebaseProfileCompletionActive = true;
    setFirebaseSyncStatus("pending", "Conclua seu ID para começar a sincronizar.");
    if (typeof openSocialProfileCompletion === "function") {
      openSocialProfileCompletion(buildFirebaseProfileSeed(authUser));
    }
    return { requiresProfile: true };
  }

  firebaseProfileCompletionActive = false;
  firebaseAuthUser = authUser;
  const profile = upsertFirebaseLocalProfile(authUser, resolvedProfile);
  firebasePendingProfile = null;
  currentUserId = profile.id;
  localStorage.setItem(CURRENT_USER_KEY, currentUserId);
  refreshAccountUi();
  setFirebaseSyncStatus("syncing", "Verificando seus dados na nuvem...");
  await persistFirebaseAccountProfile(authUser.uid, profile);

  try {
    await resolveFirebaseInitialSync(authUser.uid, transitionId);
  } catch (error) {
    if (transitionId !== firebaseAuthTransitionId) return;
    console.error("Falha na sincronização inicial do Firebase.", error);
    firebaseCloudReady = true;
    setFirebaseSyncStatus("error", getFirebaseSyncErrorMessage(error));
  }
  return { requiresProfile: false, profile };
}

function isFirebaseAccountProfileComplete(profile) {
  return Boolean(
    profile
    && String(profile.name || "").trim().length >= 2
    && typeof isValidNotiUsername === "function"
    && isValidNotiUsername(normalizeUsername(profile.username || "")),
  );
}

function buildFirebaseProfileSeed(authUser) {
  const providerEmail = authUser.providerData.find((provider) => provider?.email)?.email || "";
  const providerId = authUser.providerData.find((provider) => provider?.providerId)?.providerId || "";
  const email = String(authUser.email || providerEmail || "").trim().toLowerCase();
  return {
    uid: authUser.uid,
    name: String(authUser.displayName || email.split("@")[0] || "Usuário").trim(),
    email,
    photo: String(authUser.photoURL || ""),
    providerId,
    providerLabel: providerId === "github.com" ? "GitHub" : providerId === "google.com" ? "Google" : "provedor conectado",
    createdAt: Date.now(),
  };
}

async function findFirebaseCompletedProfile(authUser, preferredProfile = null) {
  if (isFirebaseAccountProfileComplete(preferredProfile)) return preferredProfile;

  const seed = buildFirebaseProfileSeed(authUser);
  const localProfile = users.find((user) => (
    user.id === authUser.uid
    || (seed.email && user.email === seed.email)
  ));
  if (isFirebaseAccountProfileComplete(localProfile)) return localProfile;
  if (!firebaseDatabase || !navigator.onLine) return null;

  try {
    const profileSnapshot = await runFirebaseRequest(() => (
      firebaseDatabase.ref(`users/${authUser.uid}/accountProfile`).once("value")
    ));
    const remoteProfile = profileSnapshot.val();
    if (isFirebaseAccountProfileComplete(remoteProfile)) {
      return { ...seed, ...remoteProfile, uid: authUser.uid, id: authUser.uid, profileComplete: true };
    }
  } catch (error) {
    console.warn("Não foi possível consultar o perfil resumido do Firebase.", error);
  }

  try {
    const backup = await downloadFirebaseSnapshot(authUser.uid);
    if (isFirebaseAccountProfileComplete(backup?.profile)) {
      return { ...seed, ...backup.profile, uid: authUser.uid, id: authUser.uid, profileComplete: true };
    }
  } catch (error) {
    console.warn("Não foi possível consultar o perfil do backup.", error);
  }
  return null;
}

async function persistFirebaseAccountProfile(uid, profile) {
  if (!firebaseDatabase || !uid || !isFirebaseAccountProfileComplete(profile) || !navigator.onLine) return;
  const summary = {
    name: String(profile.name || "").trim(),
    username: normalizeUsername(profile.username || ""),
    email: String(profile.email || "").trim().toLowerCase(),
    profileComplete: true,
    providerIds: Array.isArray(profile.providerIds) ? profile.providerIds.filter(Boolean) : [],
    updatedAt: Date.now(),
  };
  try {
    await runFirebaseRequest(() => firebaseDatabase.ref(`users/${uid}/accountProfile`).set(summary));
  } catch (error) {
    console.warn("O perfil foi conectado, mas o resumo não pôde ser atualizado.", error);
  }
}

function upsertFirebaseLocalProfile(authUser, preferredProfile = null) {
  const providerEmail = authUser.providerData.find((provider) => provider?.email)?.email || "";
  const email = String(authUser.email || providerEmail || preferredProfile?.email || "").trim().toLowerCase();
  const byUid = users.find((user) => user.id === authUser.uid) || null;
  const byEmail = users.find((user) => email && user.email === email) || null;
  const existing = byUid || byEmail;
  const source = preferredProfile || existing || {};
  const now = Date.now();
  const providerIds = authUser.providerData
    .map((provider) => provider?.providerId)
    .filter(Boolean);
  const fallbackName = authUser.displayName || email.split("@")[0] || "Usuário";
  const fallbackUsername = normalizeUsername(fallbackName.replace(/[^a-zA-Z0-9._-]/g, "") || "usuario");
  const profile = {
    id: authUser.uid,
    name: source.name || existing?.name || fallbackName,
    username: normalizeUsername(source.username || existing?.username || fallbackUsername),
    email,
    phone: normalizePhoneNumber(source.phone || existing?.phone || ""),
    phoneCountry: getPhoneCountry(source.phoneCountry || existing?.phoneCountry || "BR").code,
    password: "",
    photo: source.photo || existing?.photo || authUser.photoURL || "",
    cloudAccount: true,
    profileComplete: true,
    providerIds,
    timeGameScore: normalizeNumber(source.timeGameScore ?? existing?.timeGameScore, 0),
    notisualScore: normalizeNumber(source.notisualScore ?? existing?.notisualScore, 0),
    createdAt: Number.isFinite(source.createdAt) ? source.createdAt : Number.isFinite(existing?.createdAt) ? existing.createdAt : now,
    updatedAt: now,
  };

  const nextUsers = users.filter((user) => user.id !== authUser.uid && (!email || user.email !== email));
  nextUsers.push(profile);
  users = nextUsers;
  saveUsers();
  return profile;
}

async function resolveFirebaseInitialSync(uid, transitionId) {
  const remote = await downloadFirebaseSnapshot(uid);
  if (transitionId !== firebaseAuthTransitionId || firebaseAuthUser?.uid !== uid) return;

  const meta = getFirebaseSyncMeta(uid);
  const remoteUpdatedAt = normalizeNumber(remote?.cloudUpdatedAt, 0);
  const hasUnsyncedLocalChanges = meta.dirtyAt > meta.lastSyncedAt && meta.dirtyAt > remoteUpdatedAt;
  firebaseCloudReady = true;

  if (!remote) {
    updateFirebaseSyncMeta(uid, { dirtyAt: Date.now() });
    await flushFirebaseSync({ force: true });
    return;
  }

  if (hasUnsyncedLocalChanges) {
    await flushFirebaseSync({ force: true });
    return;
  }

  applyFirebaseSnapshot(remote);
  updateFirebaseSyncMeta(uid, {
    lastSyncedAt: remoteUpdatedAt || Date.now(),
    dirtyAt: 0,
  });
  setFirebaseSyncStatus("synced", buildFirebaseSyncedMessage(remoteUpdatedAt));
}

function markFirebaseDataDirty() {
  if (firebaseApplyingSnapshot || !firebaseAuthUser || !firebaseCloudReady) return;
  updateFirebaseSyncMeta(firebaseAuthUser.uid, { dirtyAt: Date.now() });
  setFirebaseSyncStatus(navigator.onLine ? "pending" : "offline", navigator.onLine
    ? "Alteracoes salvas localmente. Sincronizacao pendente."
    : "Sem internet. As alterações continuam salvas neste dispositivo.");
  scheduleFirebaseSync();
}

function scheduleFirebaseSync(delay = FIREBASE_SYNC_DEBOUNCE_MS) {
  if (!firebaseAuthUser || !firebaseCloudReady) return;
  clearTimeout(firebaseSyncTimer);
  firebaseSyncTimer = window.setTimeout(() => {
    firebaseSyncTimer = 0;
    void flushFirebaseSync();
  }, delay);
}

async function flushFirebaseSync({ force = false } = {}) {
  if (!firebaseAuthUser || !firebaseDatabase || !firebaseCloudReady) return false;
  if (!navigator.onLine) {
    setFirebaseSyncStatus("offline", "Sem internet. As alterações continuam salvas neste dispositivo.");
    return false;
  }
  if (firebaseSyncInFlight) {
    firebaseSyncQueued = true;
    return firebaseSyncInFlight;
  }

  const uid = firebaseAuthUser.uid;
  const meta = getFirebaseSyncMeta(uid);
  if (!force && !(meta.dirtyAt > meta.lastSyncedAt)) return true;
  const syncStartedAt = Date.now();
  setFirebaseSyncStatus("syncing", "Salvando notas, preferências e pontuação...");

  firebaseSyncInFlight = (async () => {
    const payload = createFirebaseSyncPayload(syncStartedAt);
    await uploadFirebaseSnapshot(uid, payload);
    const latestMeta = getFirebaseSyncMeta(uid);
    const changedDuringUpload = latestMeta.dirtyAt > syncStartedAt;
    updateFirebaseSyncMeta(uid, {
      lastSyncedAt: syncStartedAt,
      dirtyAt: changedDuringUpload ? latestMeta.dirtyAt : 0,
    });
    setFirebaseSyncStatus("synced", buildFirebaseSyncedMessage(syncStartedAt));
    return true;
  })();

  let syncCompleted = false;
  try {
    const result = await firebaseSyncInFlight;
    syncCompleted = Boolean(result);
    return result;
  } catch (error) {
    console.error("Não foi possível salvar os dados no Firebase.", error);
    setFirebaseSyncStatus("error", getFirebaseSyncErrorMessage(error));
    return false;
  } finally {
    firebaseSyncInFlight = null;
    if (syncCompleted && (firebaseSyncQueued || getFirebaseSyncMeta(uid).dirtyAt > getFirebaseSyncMeta(uid).lastSyncedAt)) {
      firebaseSyncQueued = false;
      scheduleFirebaseSync(300);
    } else {
      firebaseSyncQueued = false;
    }
  }
}

function createFirebaseSyncPayload(cloudUpdatedAt = Date.now()) {
  return {
    ...createNotesBackupPayload(),
    cloudUpdatedAt,
    firebaseUid: firebaseAuthUser?.uid || "",
  };
}

async function uploadFirebaseSnapshot(uid, payload) {
  const json = JSON.stringify(payload);
  const chunks = [];
  for (let offset = 0; offset < json.length; offset += FIREBASE_SYNC_CHUNK_SIZE) {
    chunks.push(json.slice(offset, offset + FIREBASE_SYNC_CHUNK_SIZE));
  }

  const version = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const userRoot = firebaseDatabase.ref(`users/${uid}`);
  const manifestRef = userRoot.child("sync/manifest");
  const previousManifest = (await runFirebaseRequest(() => manifestRef.once("value"))).val();
  const chunksRef = userRoot.child(`backups/${version}/chunks`);

  for (let index = 0; index < chunks.length; index += 1) {
    await runFirebaseRequest(() => chunksRef.child(String(index)).set(chunks[index]));
  }

  await runFirebaseRequest(() => manifestRef.set({
    activeVersion: version,
    chunkCount: chunks.length,
    size: json.length,
    updatedAt: payload.cloudUpdatedAt,
    backupVersion: BACKUP_VERSION,
  }));

  const previousVersion = previousManifest?.activeVersion;
  if (previousVersion && previousVersion !== version) {
    userRoot.child(`backups/${previousVersion}`).remove().catch((error) => {
      console.warn("Não foi possível remover a versão anterior do backup.", error);
    });
  }
}

async function downloadFirebaseSnapshot(uid) {
  if (!firebaseDatabase || !uid || !navigator.onLine) return null;
  const userRoot = firebaseDatabase.ref(`users/${uid}`);
  const manifestSnapshot = await runFirebaseRequest(() => userRoot.child("sync/manifest").once("value"));
  const manifest = manifestSnapshot.val();
  if (!manifest?.activeVersion || !Number.isFinite(Number(manifest.chunkCount))) return null;

  const chunksSnapshot = await runFirebaseRequest(() => userRoot.child(`backups/${manifest.activeVersion}/chunks`).once("value"));
  const chunkValue = chunksSnapshot.val();
  if (chunkValue == null) throw new Error("Backup remoto incompleto.");
  const chunks = Array.isArray(chunkValue)
    ? chunkValue
    : Object.keys(chunkValue).sort((a, b) => Number(a) - Number(b)).map((key) => chunkValue[key]);
  if (chunks.length !== Number(manifest.chunkCount) || chunks.some((chunk) => typeof chunk !== "string")) {
    throw new Error("Backup remoto incompleto.");
  }

  const payload = JSON.parse(chunks.join(""));
  extractBackupState(payload);
  payload.cloudUpdatedAt = normalizeNumber(payload.cloudUpdatedAt, normalizeNumber(manifest.updatedAt, 0));
  return payload;
}

function applyFirebaseSnapshot(payload) {
  const nextState = extractBackupState(payload);
  const nextPreferences = extractBackupPreferences(payload);
  firebaseApplyingSnapshot = true;
  try {
    restoreBackupData(nextState, nextPreferences);
    const current = getCurrentUser();
    if (current && payload.profile && typeof payload.profile === "object") {
      const remoteProfile = payload.profile;
      current.name = remoteProfile.name || current.name;
      current.username = normalizeUsername(remoteProfile.username || current.username);
      current.phone = normalizePhoneNumber(remoteProfile.phone || current.phone);
      current.phoneCountry = getPhoneCountry(remoteProfile.phoneCountry || current.phoneCountry || "BR").code;
      current.photo = remoteProfile.photo || current.photo;
      current.profileComplete = true;
      current.timeGameScore = normalizeNumber(remoteProfile.timeGameScore, current.timeGameScore);
      current.notisualScore = normalizeNumber(remoteProfile.notisualScore, current.notisualScore);
      current.cloudAccount = true;
      current.providerIds = firebaseAuthUser?.providerData.map((provider) => provider.providerId).filter(Boolean) || [];
      current.updatedAt = Date.now();
      saveUsers();
    }
  } finally {
    firebaseApplyingSnapshot = false;
  }
  refreshAccountUi();
  render();
}

async function runFirebaseRequest(operation, attempts = 3) {
  let lastError = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await withFirebaseTimeout(operation(), 20000);
    } catch (error) {
      lastError = error;
      if (!navigator.onLine || /permission_denied/i.test(String(error?.code || error?.message))) break;
      await waitForFirebaseRetry(350 * (2 ** attempt));
    }
  }
  throw lastError || new Error("Falha de conexao com o Firebase.");
}

function withFirebaseTimeout(promise, timeoutMs) {
  let timer = 0;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = window.setTimeout(() => reject(new Error("Tempo limite da conexao excedido.")), timeoutMs);
    }),
  ]).finally(() => clearTimeout(timer));
}

function waitForFirebaseRetry(delay) {
  return new Promise((resolve) => window.setTimeout(resolve, delay));
}

function getFirebaseSyncMeta(uid) {
  try {
    const allMeta = JSON.parse(localStorage.getItem(FIREBASE_SYNC_META_KEY) || "{}");
    const value = allMeta?.[uid] || {};
    return {
      lastSyncedAt: normalizeNumber(value.lastSyncedAt, 0),
      dirtyAt: normalizeNumber(value.dirtyAt, 0),
    };
  } catch (error) {
    return { lastSyncedAt: 0, dirtyAt: 0 };
  }
}

function updateFirebaseSyncMeta(uid, updates) {
  if (!uid) return;
  try {
    const allMeta = JSON.parse(localStorage.getItem(FIREBASE_SYNC_META_KEY) || "{}");
    allMeta[uid] = { ...getFirebaseSyncMeta(uid), ...updates };
    localStorage.setItem(FIREBASE_SYNC_META_KEY, JSON.stringify(allMeta));
  } catch (error) {
    console.warn("Não foi possível salvar o estado da sincronização.", error);
  }
}

function setFirebaseSyncStatus(stateName, message) {
  firebaseSyncState = stateName;
  firebaseSyncMessage = message;
  if (elements?.profileStatus) elements.profileStatus.textContent = getProfileStatusText(getCurrentUser());
  renderFirebaseSyncUi();
}

function renderFirebaseSyncUi() {
  if (!elements?.cloudSyncPanel) return;
  const user = getCurrentUser();
  const connected = Boolean(user && firebaseAuthUser?.uid === user.id);
  elements.cloudSyncPanel.hidden = !user;
  if (elements.cloudSyncDetail) elements.cloudSyncDetail.textContent = firebaseSyncMessage;
  const busy = firebaseSyncState === "syncing";
  elements.cloudSaveButton.disabled = busy;
  elements.cloudLoadButton.disabled = busy;
  elements.cloudSaveButton.setAttribute("aria-busy", String(busy));
  elements.cloudLoadButton.setAttribute("aria-busy", String(busy));
  elements.cloudSaveButton.title = connected ? "Salvar dados na nuvem" : "Conectar esta conta a nuvem";
  elements.cloudLoadButton.title = connected ? "Baixar os dados mais recentes" : "Entrar em uma conta sincronizada";
}

function buildFirebaseSyncedMessage(timestamp) {
  if (!timestamp) return "Dados sincronizados.";
  return `Sincronizado em ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(timestamp)}.`;
}

function getFirebaseSyncErrorMessage(error) {
  const code = String(error?.code || "").toLowerCase();
  if (!navigator.onLine || code.includes("network")) return "Sem conexao com a nuvem. Seus dados locais foram preservados.";
  if (code.includes("permission")) return "O Firebase recusou o acesso. Confira as regras do Realtime Database.";
  return "Não foi possível sincronizar agora. Seus dados locais foram preservados.";
}

async function saveFirebaseDataManually() {
  if (!firebaseAuthUser) {
    prefillFirebaseAccountModal("signup");
    showToast("Crie ou conecte uma conta para salvar na nuvem");
    return;
  }
  updateFirebaseSyncMeta(firebaseAuthUser.uid, { dirtyAt: Date.now() });
  const saved = await flushFirebaseSync({ force: true });
  showToast(saved ? "Dados salvos na nuvem" : "Não foi possível salvar agora");
}

async function loadFirebaseDataManually() {
  if (!firebaseAuthUser) {
    prefillFirebaseAccountModal("login");
    showToast("Entre na conta que possui seus dados");
    return;
  }
  if (!navigator.onLine) {
    showToast("Conecte-se a internet para sincronizar");
    return;
  }

  const meta = getFirebaseSyncMeta(firebaseAuthUser.uid);
  if (meta.dirtyAt > meta.lastSyncedAt && !confirm("Existem alterações locais ainda não enviadas. Deseja substituí-las pelos dados da nuvem?")) return;
  setFirebaseSyncStatus("syncing", "Baixando seus dados mais recentes...");
  try {
    const payload = await downloadFirebaseSnapshot(firebaseAuthUser.uid);
    if (!payload) {
      setFirebaseSyncStatus("pending", "Ainda não existe um backup nesta conta.");
      showToast("Nenhum backup encontrado nesta conta");
      return;
    }
    applyFirebaseSnapshot(payload);
    updateFirebaseSyncMeta(firebaseAuthUser.uid, { lastSyncedAt: payload.cloudUpdatedAt || Date.now(), dirtyAt: 0 });
    setFirebaseSyncStatus("synced", buildFirebaseSyncedMessage(payload.cloudUpdatedAt));
    showToast("Dados sincronizados neste dispositivo");
  } catch (error) {
    console.error("Não foi possível baixar os dados do Firebase.", error);
    setFirebaseSyncStatus("error", getFirebaseSyncErrorMessage(error));
    showToast("Não foi possível sincronizar agora");
  }
}

function prefillFirebaseAccountModal(panel) {
  const user = getCurrentUser();
  openAccountModal(panel);
  if (!user) return;
  if (panel === "login") {
    elements.loginIdentifierInput.value = user.email || "";
    return;
  }
  elements.signupNameInput.value = user.name || "";
  elements.signupUsernameInput.value = user.username || "@";
  elements.signupEmailInput.value = user.email || "";
  elements.signupPhoneInput.value = user.phone || "";
  elements.signupCountrySelect.value = user.phoneCountry || "BR";
  currentSignupPhoto = user.photo || "";
  renderAvatar(elements.signupPhotoPreview, user);
}

function getFirebaseUsernameKey(username) {
  return Array.from(normalizeUsername(username).slice(1).toLowerCase())
    .map((character) => character.codePointAt(0).toString(16).padStart(4, "0"))
    .join("-");
}

async function checkFirebaseUsernameAvailability(username, ownerUid = "") {
  const normalized = normalizeUsername(username);
  const localOwner = users.find((user) => user.username?.toLowerCase() === normalized.toLowerCase());
  if (localOwner && (!ownerUid || localOwner.id !== ownerUid)) return { available: false, verified: true };
  if (!firebaseDatabase || !navigator.onLine) return { available: true, verified: false };

  try {
    const snapshot = await firebaseDatabase.ref(`usernames/${getFirebaseUsernameKey(normalized)}`).once("value");
    const storedOwner = snapshot.val();
    return { available: !storedOwner || storedOwner === ownerUid, verified: true };
  } catch (error) {
    console.warn("A verificação global do User ID não está disponível.", error);
    return { available: true, verified: false };
  }
}

async function claimFirebaseUsername(username, uid) {
  if (!firebaseDatabase || !uid || !navigator.onLine) return { claimed: true, verified: false };
  const reference = firebaseDatabase.ref(`usernames/${getFirebaseUsernameKey(username)}`);
  try {
    const result = await reference.transaction((currentOwner) => {
      if (currentOwner === null || currentOwner === uid) return uid;
      return;
    }, undefined, false);
    return { claimed: result.snapshot?.val() === uid, verified: true };
  } catch (error) {
    console.warn("O User ID foi salvo sem índice global. Atualize as regras do Firebase para validar entre dispositivos.", error);
    return { claimed: true, verified: false };
  }
}

async function handleFirebaseProviderLogin(providerName) {
  if (!firebaseAuth) {
    showToast("Firebase ainda não está disponível");
    return;
  }
  const current = getCurrentUser();
  firebasePendingProfile = current ? clonePlainData(current) : null;
  const provider = providerName === "github"
    ? new window.firebase.auth.GithubAuthProvider()
    : new window.firebase.auth.GoogleAuthProvider();
  if (providerName === "github") {
    provider.addScope("read:user");
    provider.addScope("user:email");
  }
  if (providerName === "google") provider.setCustomParameters({ prompt: "select_account" });
  const isSignupIntent = typeof activeAccountPanel !== "undefined" && activeAccountPanel === "signup";
  firebaseProviderAuthPending = true;
  firebaseDeferredAuthUser = null;
  setFirebaseAuthBusy(true);
  try {
    const result = await firebaseAuth.signInWithPopup(provider);
    if (!result?.user) throw new Error("O provedor não retornou uma conta autenticada.");
    firebaseProviderAuthPending = false;
    firebaseDeferredAuthUser = null;
    const authState = await handleFirebaseAuthState(result.user);
    if (authState?.requiresProfile) return;
    closeModals();
    const providerLabel = providerName === "github" ? "GitHub" : "Google";
    showToast(isSignupIntent ? `ID conectado com ${providerLabel}` : `Conta ${providerLabel} conectada`);
  } catch (error) {
    firebaseProviderAuthPending = false;
    firebaseDeferredAuthUser = null;
    firebasePendingProfile = null;
    console.warn("Login externo falhou.", error);
    if (error?.code !== "auth/popup-closed-by-user" && error?.code !== "auth/cancelled-popup-request") {
      showToast(formatFirebaseAuthError(error));
    }
  } finally {
    setFirebaseAuthBusy(false);
  }
}

async function completeFirebaseSocialAccount(profile) {
  const authUser = firebaseAuth?.currentUser || firebaseAuthUser;
  if (!authUser || authUser.uid !== profile?.uid) {
    throw Object.assign(new Error("A sessão do provedor expirou."), { code: "auth/user-token-expired" });
  }

  const username = normalizeUsername(profile.username || "");
  const availability = await checkFirebaseUsernameAvailability(username, authUser.uid);
  if (!availability.available) {
    throw Object.assign(new Error("Este User ID já está em uso."), { code: "auth/username-already-in-use" });
  }
  const claim = await claimFirebaseUsername(username, authUser.uid);
  if (!claim.claimed) {
    throw Object.assign(new Error("Este User ID já está em uso."), { code: "auth/username-already-in-use" });
  }

  const seed = buildFirebaseProfileSeed(authUser);
  firebasePendingProfile = {
    ...seed,
    ...profile,
    id: authUser.uid,
    uid: authUser.uid,
    username,
    password: "",
    cloudAccount: true,
    profileComplete: true,
    providerIds: authUser.providerData.map((providerData) => providerData?.providerId).filter(Boolean),
    createdAt: Number.isFinite(profile.createdAt) ? profile.createdAt : Date.now(),
    updatedAt: Date.now(),
  };

  await authUser.updateProfile({ displayName: firebasePendingProfile.name });
  firebaseProfileCompletionActive = false;
  const authState = await handleFirebaseAuthState(authUser, { profileReady: true });
  if (authState?.requiresProfile) throw new Error("O perfil não pôde ser concluído.");
  return authState?.profile || firebasePendingProfile;
}

async function cancelFirebaseSocialAccountCompletion() {
  firebaseProfileCompletionActive = false;
  firebasePendingProfile = null;
  firebaseDeferredAuthUser = null;
  if (firebaseAuth?.currentUser) {
    try {
      await firebaseAuth.signOut();
    } catch (error) {
      console.warn("Não foi possível encerrar o cadastro incompleto.", error);
    }
  }
  firebaseAuthUser = null;
  firebaseCloudReady = false;
}

function setFirebaseAuthBusy(busy) {
  [
    elements.googleAuthButton,
    elements.githubAuthButton,
    elements.emailAuthButton,
    elements.loginForm?.querySelector('[type="submit"]'),
    elements.signupForm?.querySelector('[type="submit"]'),
    elements.socialProfileSubmit,
  ].filter(Boolean).forEach((button) => {
    button.disabled = busy;
    button.setAttribute("aria-busy", String(busy));
  });
}

function formatFirebaseAuthError(error) {
  const messages = {
    "auth/account-exists-with-different-credential": "Este e-mail já usa outro método de entrada.",
    "auth/cancelled-popup-request": "A entrada anterior foi cancelada.",
    "auth/email-already-in-use": "Este e-mail já possui uma conta. Use Entrar.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/network-request-failed": "Falha de conexao. Confira sua internet.",
    "auth/operation-not-allowed": "Este método de entrada não está habilitado.",
    "auth/popup-blocked": "O navegador bloqueou a janela de login. Permita pop-ups para o Noti e tente novamente.",
    "auth/popup-closed-by-user": "A janela de login foi fechada.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "auth/unauthorized-domain": "Este domínio ainda não foi autorizado no Firebase.",
    "auth/username-already-in-use": "Este User ID já está em uso.",
    "auth/user-token-expired": "Sua sessão expirou. Conecte a conta novamente.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "auth/user-not-found": "Conta não encontrada.",
    "auth/weak-password": "Use uma senha com pelo menos 6 caracteres.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
  };
  return messages[error?.code] || "Não foi possível conectar a conta agora.";
}
