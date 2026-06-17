const STORAGE_KEY = "checklist-os-state-v1";
const THEME_KEY = "checklist-os-theme";
const USER_STORE_KEY = "noti-users-v1";
const CURRENT_USER_KEY = "noti-current-user-v1";
const PREFS_KEY = "noti-preferences-v1";
const BACKUP_TYPE = "noti-backup";
const BACKUP_VERSION = 1;
const MAX_ATTACHMENT_BYTES = 2.5 * 1024 * 1024;
const DEFAULT_TOOLBAR_ITEMS = ["theme", "separator-main", "attach", "draw", "drawingBlock", "pin", "archive", "delete", "restore", "search", "settings", "account"];
const TOOLBAR_LABELS = {
  settings: "Configurações",
  theme: "Tema",
  attach: "Anexo",
  draw: "Caneta",
  drawingBlock: "Bloco de desenho",
  pin: "Fixar",
  archive: "Arquivar",
  delete: "Lixeira",
  restore: "Restaurar",
  search: "Pesquisa",
  account: "Entrar",
};
const ACCENT_COLORS = ["#b98500", "#007aff", "#34c759", "#ff3b30", "#af52de", "#ff9500", "#64d2ff", "#ff2d55", "#5856d6", "#8e8e93"];
const FOLDER_COLORS = ACCENT_COLORS.slice();
const TEXT_SIZE_OPTIONS = [14, 16, 18, 22, 28, 34];
const DEFAULT_DRAWING_TOOL = { mode: "pen", color: "#b98500", width: 6, context: "page", blockId: "" };
const PHONE_COUNTRIES = [
  { code: "BR", name: "Brasil", dial: "+55", flag: "\uD83C\uDDE7\uD83C\uDDF7" },
  { code: "US", name: "Estados Unidos", dial: "+1", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "PT", name: "Portugal", dial: "+351", flag: "\uD83C\uDDF5\uD83C\uDDF9" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "\uD83C\uDDE6\uD83C\uDDF7" },
  { code: "CL", name: "Chile", dial: "+56", flag: "\uD83C\uDDE8\uD83C\uDDF1" },
  { code: "MX", name: "M\u00e9xico", dial: "+52", flag: "\uD83C\uDDF2\uD83C\uDDFD" },
  { code: "ES", name: "Espanha", dial: "+34", flag: "\uD83C\uDDEA\uD83C\uDDF8" },
  { code: "FR", name: "Fran\u00e7a", dial: "+33", flag: "\uD83C\uDDEB\uD83C\uDDF7" },
  { code: "IT", name: "It\u00e1lia", dial: "+39", flag: "\uD83C\uDDEE\uD83C\uDDF9" },
  { code: "GB", name: "Reino Unido", dial: "+44", flag: "\uD83C\uDDEC\uD83C\uDDE7" },
  { code: "DE", name: "Alemanha", dial: "+49", flag: "\uD83C\uDDE9\uD83C\uDDEA" },
  { code: "JP", name: "Jap\u00e3o", dial: "+81", flag: "\uD83C\uDDEF\uD83C\uDDF5" },
];
const THEME_OPTIONS = {
  light: { label: "Claro", icon: "#icon-sun" },
  dark: { label: "Escuro", icon: "#icon-moon" },
  coffee: { label: "Coffee", icon: "#icon-coffee" },
};
const BRAND_ASSETS = {
  favicon: {
    light: "assets/white-icon-noti.ico",
    dark: "assets/dark-icon-noti.ico",
    coffee: "assets/coffee-icon-noti.ico",
  },
  logo: {
    light: "assets/dark-logo-noti.png",
    dark: "assets/white-logo-noti.png",
    coffee: "assets/coffee-logo-noti.png",
  },
  loginLogo: {
    light: "assets/white-logo-noti.png",
    dark: "assets/dark-logo-noti.png",
    coffee: "assets/white-logo-noti.png",
  },
  iso: {
    light: "assets/dark-iso-noti.png",
    dark: "assets/white-iso-noti.png",
    coffee: "assets/coffee-iso-noti.png",
  },
};

const state = loadState();
let users = loadUsers();
let currentUserId = localStorage.getItem(CURRENT_USER_KEY) || "";
let preferences = loadPreferences();
let currentSignupPhoto = "";
let pendingProfilePhoto = "";
let currentView = "all";
let selectedNoteId = state.notes.find((note) => !note.trashed && !note.archived)?.id ?? null;
let draggedNoteId = null;
let toastTimer = null;
let activeTextBlockId = null;
let activeTextSelection = { start: 0, end: 0 };
let activeRichEditor = null;
let activeRichRange = null;
let activeRichSelection = null;
let richTextPressTimer = 0;
let richTextPressPoint = null;
let checklistImageTargetId = null;
let shoppingImageTargetId = null;
let editingFolderId = null;
let selectedFolderColor = "#007aff";
let draggedToolbarKey = "";
let toolbarContextTargetKey = "";
let drawingTool = { ...DEFAULT_DRAWING_TOOL, color: preferences?.accent || DEFAULT_DRAWING_TOOL.color };
let activeDrawingPointer = null;
let activeDrawingStroke = null;
let editorCanvasRaf = 0;
let activeDrawingBlockId = "";
let drawToolMinimized = false;
let drawToolPosition = { x: 0, y: 0, placed: false };
let drawToolDragState = null;
const drawingRedoStacks = new Map();
let draggedNoteBlockIds = [];
let draggedChecklistItemId = "";
let draggedShoppingItemId = "";
let draggedDrawingBlockId = "";
let mobileScreen = "folders";
let mobileSettingsReturnScreen = "folders";
let mobileNoteMenuTargetId = "";
let mobileNotePressTimer = 0;
let mobileNotePointer = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  sidebar: $("#sidebar"),
  sidebarScrim: $("#sidebarScrim"),
  openSidebarButton: $("#openSidebarButton"),
  closeSidebarButton: $("#closeSidebarButton"),
  topbar: $(".topbar"),
  topToolbar: $("#topToolbar"),
  toolbarContextMenu: $("#toolbarContextMenu"),
  themeButton: $("#themeButton"),
  themeIcon: $("#themeIcon use"),
  accountButton: $("#accountButton"),
  accountAvatar: $("#accountAvatar"),
  accountLabel: $("#accountLabel"),
  settingsButton: $("#settingsButton"),
  favicon: $("#favicon"),
  brandMark: $("#brandMark"),
  accountBrandMark: $("#accountBrandMark"),
  sidebarNoteCount: $("#sidebarNoteCount"),
  mobileBackButton: $("#mobileBackButton"),
  mobileBackLabel: $("#mobileBackLabel"),
  mobileMoreButton: $("#mobileMoreButton"),
  mobileMoreMenu: $("#mobileMoreMenu"),
  mobileEditButton: $("#mobileEditButton"),
  mobileFinishButton: $("#mobileFinishButton"),
  mobileNoteActionMenu: $("#mobileNoteActionMenu"),
  mobileFolderMoveMenu: $("#mobileFolderMoveMenu"),
  siteContextMenu: $("#siteContextMenu"),
  mobileSearchInput: $("#mobileSearchInput"),
  createMenuButton: $("#createMenuButton"),
  createTypeLayer: $("#createTypeLayer"),
  sidebarCollapseButton: $("#sidebarCollapseButton"),
  addFolderButton: $("#addFolderButton"),
  folderList: $("#folderList"),
  searchInput: $("#searchInput"),
  emptyTrashButton: $("#emptyTrashButton"),
  allCount: $("#allCount"),
  pinnedCount: $("#pinnedCount"),
  trashCount: $("#trashCount"),
  viewTitle: $("#viewTitle"),
  viewMeta: $("#viewMeta"),
  topbarTitle: $("#topbarTitle"),
  topbarMeta: $("#topbarMeta"),
  currentScope: $("#currentScope"),
  notesList: $("#notesList"),
  emptyState: $("#emptyState"),
  editor: $("#editor"),
  editorEmpty: $("#editorEmpty"),
  editorToolbar: $(".editor-toolbar"),
  noteTypeButton: $("#noteTypeButton"),
  checklistTypeButton: $("#checklistTypeButton"),
  shoppingTypeButton: $("#shoppingTypeButton"),
  goalTypeButton: $("#goalTypeButton"),
  segmentedControl: $(".segmented-control"),
  textFormatToolbar: $("#textFormatToolbar"),
  formatSizeButton: $("#formatSizeButton"),
  formatSizeValue: $("#formatSizeValue"),
  formatSizeMenu: $("#formatSizeMenu"),
  textFormatMenu: $("#textFormatMenu"),
  textFormatSizeOptions: $("#textFormatSizeOptions"),
  formatColorOptions: $("#formatColorOptions"),
  finalizeNoteButton: $("#finalizeNoteButton"),
  pinButton: $("#pinButton"),
  archiveButton: $("#archiveButton"),
  deleteButton: $("#deleteButton"),
  restoreButton: $("#restoreButton"),
  attachButton: $("#attachButton"),
  drawButton: $("#drawButton"),
  drawingBlockButton: $("#drawingBlockButton"),
  drawToolPopover: $("#drawToolPopover"),
  drawToolCard: $("#drawToolCard"),
  drawToolHead: $("#drawToolHead"),
  drawToolBody: $("#drawToolBody"),
  minimizeDrawToolButton: $("#minimizeDrawToolButton"),
  minimizeDrawToolIcon: $("#minimizeDrawToolIcon"),
  closeDrawToolButton: $("#closeDrawToolButton"),
  drawToolKicker: $("#drawToolKicker"),
  drawToolTitle: $("#drawToolTitle"),
  drawModeRow: $("#drawModeRow"),
  drawColorOptions: $("#drawColorOptions"),
  drawWidthInput: $("#drawWidthInput"),
  drawWidthLabel: $("#drawWidthLabel"),
  undoDrawingButton: $("#undoDrawingButton"),
  redoDrawingButton: $("#redoDrawingButton"),
  clearDrawingButton: $("#clearDrawingButton"),
  finishDrawingButton: $("#finishDrawingButton"),
  editorDrawingLayer: $("#editorDrawingLayer"),
  editorDrawingCanvas: $("#editorDrawingCanvas"),
  drawingBlocksPanel: $("#drawingBlocksPanel"),
  mediaInput: $("#mediaInput"),
  checklistImageInput: $("#checklistImageInput"),
  titleInput: $("#titleInput"),
  folderSelect: $("#folderSelect"),
  updatedLabel: $("#updatedLabel"),
  attachmentsPanel: $("#attachmentsPanel"),
  noteBlockEditor: $("#noteBlockEditor"),
  bodyInput: $("#bodyInput"),
  checklistEditor: $("#checklistEditor"),
  checklistItems: $("#checklistItems"),
  addItemForm: $("#addItemForm"),
  newItemInput: $("#newItemInput"),
  shoppingEditor: $("#shoppingEditor"),
  shoppingItems: $("#shoppingItems"),
  addShoppingItemForm: $("#addShoppingItemForm"),
  newShoppingItemInput: $("#newShoppingItemInput"),
  newShoppingQtyInput: $("#newShoppingQtyInput"),
  newShoppingPriceInput: $("#newShoppingPriceInput"),
  currencySelect: $("#currencySelect"),
  shoppingTotalText: $("#shoppingTotalText"),
  goalEditor: $("#goalEditor"),
  goalForm: $("#goalForm"),
  goalNameInput: $("#goalNameInput"),
  goalTargetInput: $("#goalTargetInput"),
  goalSavedInput: $("#goalSavedInput"),
  goalCategoryInput: $("#goalCategoryInput"),
  goalColorOptions: $("#goalColorOptions"),
  goalStartDateInput: $("#goalStartDateInput"),
  goalHasDeadlineInput: $("#goalHasDeadlineInput"),
  goalTargetDateWrap: $("#goalTargetDateWrap"),
  goalTargetDateInput: $("#goalTargetDateInput"),
  goalNotifyInput: $("#goalNotifyInput"),
  goalSummary: $("#goalSummary"),
  progressFill: $("#progressFill"),
  progressText: $("#progressText"),
  toast: $("#toast"),
  modalLayer: $("#modalLayer"),
  modalScrim: $("#modalScrim"),
  accountModal: $("#accountModal"),
  closeAccountModal: $("#closeAccountModal"),
  loginTabButton: $("#loginTabButton"),
  signupTabButton: $("#signupTabButton"),
  loginForm: $("#loginForm"),
  signupForm: $("#signupForm"),
  loginIdentifierInput: $("#loginIdentifierInput"),
  loginPasswordInput: $("#loginPasswordInput"),
  signupPhotoInput: $("#signupPhotoInput"),
  signupPhotoPreview: $("#signupPhotoPreview"),
  signupNameInput: $("#signupNameInput"),
  signupUsernameInput: $("#signupUsernameInput"),
  signupEmailInput: $("#signupEmailInput"),
  signupPhoneInput: $("#signupPhoneInput"),
  signupCountrySelect: $("#signupCountrySelect"),
  signupPasswordInput: $("#signupPasswordInput"),
  settingsModal: $("#settingsModal"),
  closeSettingsModal: $("#closeSettingsModal"),
  settingsHeaderAvatar: $("#settingsHeaderAvatar"),
  profileDisplayName: $("#profileDisplayName"),
  profileDisplayUsername: $("#profileDisplayUsername"),
  profileStatsStrip: $("#profileStatsStrip"),
  activityGrid: $("#activityGrid"),
  editProfileButton: $("#editProfileButton"),
  settingsTabs: $$(".settings-tabs button"),
  settingsPanels: $$(".settings-panel"),
  settingsProfilePhoto: $("#settingsProfilePhoto"),
  settingsPhotoInput: $("#settingsPhotoInput"),
  settingsPhotoButton: $("#settingsPhotoButton"),
  settingsNameInput: $("#settingsNameInput"),
  settingsUsernameInput: $("#settingsUsernameInput"),
  settingsEmailInput: $("#settingsEmailInput"),
  settingsPhoneInput: $("#settingsPhoneInput"),
  settingsCountrySelect: $("#settingsCountrySelect"),
  profileStatus: $("#profileStatus"),
  profileLoginButton: $("#profileLoginButton"),
  saveProfileButton: $("#saveProfileButton"),
  profileEditDialog: $("#profileEditDialog"),
  cancelProfileEditButton: $("#cancelProfileEditButton"),
  settingsStatsGrid: $("#settingsStatsGrid"),
  themeSelect: $("#themeSelect"),
  themeDropdown: $("#themeDropdown"),
  themeDropdownButton: $("#themeDropdownButton"),
  themeCurrentIcon: $("#themeCurrentIcon"),
  themeCurrentLabel: $("#themeCurrentLabel"),
  themePreviewGroup: $("#themePreviewGroup"),
  accentCarousel: $("#accentCarousel"),
  fontImportInput: $("#fontImportInput"),
  resetFontButton: $("#resetFontButton"),
  cursorToggleInput: $("#cursorToggleInput"),
  fontNameLabel: $("#fontNameLabel"),
  folderDefaultColors: $("#folderDefaultColors"),
  toolbarOrderList: $("#toolbarOrderList"),
  addSeparatorButton: $("#addSeparatorButton"),
  resetToolbarButton: $("#resetToolbarButton"),
  folderSettingsList: $("#folderSettingsList"),
  folderEditDialog: $("#folderEditDialog"),
  folderNameInput: $("#folderNameInput"),
  folderDialogColors: $("#folderDialogColors"),
  cancelFolderEditButton: $("#cancelFolderEditButton"),
  saveFolderButton: $("#saveFolderButton"),
  deleteFolderButton: $("#deleteFolderButton"),
  archivedNotesList: $("#archivedNotesList"),
  downloadBackupButton: $("#downloadBackupButton"),
  restoreBackupButton: $("#restoreBackupButton"),
  restoreBackupInput: $("#restoreBackupInput"),
  logoutButton: $("#logoutButton"),
  noteCardTemplate: $("#noteCardTemplate"),
};

init();

function init() {
  applyTheme(preferences.theme);
  applyPreferences();
  setupMobileLayout();
  setupPhoneCountrySelects();
  bindEvents();
  renderAccountButton();
  render();
}

function bindEvents() {
  elements.themeButton.addEventListener("click", toggleTheme);
  elements.accountButton.addEventListener("click", () => {
    if (getCurrentUser()) openSettingsModal("profile");
    else openAccountModal("login");
  });
  elements.settingsButton.addEventListener("click", () => openSettingsModal("profile"));
  elements.mobileBackButton.addEventListener("click", handleMobileBack);
  elements.mobileMoreButton.addEventListener("click", toggleMobileMoreMenu);
  elements.mobileEditButton.addEventListener("click", enableMobileNoteEditing);
  elements.mobileFinishButton.addEventListener("click", toggleFinalizeSelectedNote);
  elements.mobileMoreMenu.addEventListener("click", handleMobileMoreMenuClick);
  elements.mobileNoteActionMenu.addEventListener("click", handleMobileNoteMenuClick);
  elements.mobileFolderMoveMenu.addEventListener("click", handleMobileFolderMoveMenuClick);
  elements.openSidebarButton.addEventListener("click", openSidebar);
  elements.closeSidebarButton.addEventListener("click", closeSidebar);
  elements.sidebarScrim.addEventListener("click", closeSidebar);
  elements.modalScrim.addEventListener("click", closeModals);
  elements.closeAccountModal.addEventListener("click", closeModals);
  elements.closeSettingsModal.addEventListener("click", closeModals);
  elements.loginTabButton.addEventListener("click", () => setActiveAccountPanel("login"));
  elements.signupTabButton.addEventListener("click", () => setActiveAccountPanel("signup"));
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.signupForm.addEventListener("submit", handleSignup);
  elements.signupUsernameInput.addEventListener("input", () => keepUsernamePrefix(elements.signupUsernameInput));
  elements.signupUsernameInput.addEventListener("blur", () => normalizeUsernameInput(elements.signupUsernameInput));
  elements.signupPhotoInput.addEventListener("change", handleSignupPhoto);
  elements.settingsTabs.forEach((button) => {
    button.addEventListener("click", () => setActiveSettingsTab(button.dataset.settingsTab));
  });
  elements.profileLoginButton.addEventListener("click", openProfileAccountEntry);
  elements.editProfileButton.addEventListener("click", openProfileEditDialog);
  elements.cancelProfileEditButton.addEventListener("click", closeProfileEditDialog);
  elements.saveProfileButton.addEventListener("click", saveProfileSettings);
  elements.settingsUsernameInput.addEventListener("input", () => keepUsernamePrefix(elements.settingsUsernameInput));
  elements.settingsUsernameInput.addEventListener("blur", () => normalizeUsernameInput(elements.settingsUsernameInput));
  elements.settingsPhotoButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    elements.settingsPhotoInput.click();
  });
  elements.settingsPhotoInput.addEventListener("change", handleSettingsPhoto);
  elements.themeSelect.addEventListener("change", () => setThemePreference(elements.themeSelect.value));
  elements.themeDropdownButton.addEventListener("click", toggleThemeMenu);
  elements.themePreviewGroup.addEventListener("click", (event) => {
    const button = event.target.closest("[data-theme-choice]");
    if (button) {
      setThemePreference(button.dataset.themeChoice);
      closeThemeMenu();
    }
  });
  elements.accentCarousel.querySelectorAll("[data-accent]").forEach((button) => {
    button.addEventListener("click", () => setAccentPreference(button.dataset.accent));
  });
  elements.fontImportInput.addEventListener("change", handleFontImport);
  elements.resetFontButton.addEventListener("click", resetCustomFont);
  elements.cursorToggleInput.addEventListener("change", toggleCustomCursor);
  elements.topToolbar.addEventListener("contextmenu", openToolbarContextMenu);
  elements.topToolbar.addEventListener("dragstart", startToolbarDrag);
  elements.topToolbar.addEventListener("dragover", handleToolbarDragOver);
  elements.topToolbar.addEventListener("dragleave", clearToolbarDropTargets);
  elements.topToolbar.addEventListener("drop", dropToolbarItem);
  elements.topToolbar.addEventListener("dragend", endToolbarDrag);
  elements.folderDefaultColors.addEventListener("click", handleDefaultFolderColorClick);
  elements.folderSettingsList.addEventListener("click", handleFolderSettingsClick);
  elements.folderDialogColors.addEventListener("click", handleFolderDialogColorClick);
  elements.saveFolderButton.addEventListener("click", saveFolderDialog);
  elements.cancelFolderEditButton.addEventListener("click", closeFolderDialog);
  elements.deleteFolderButton.addEventListener("click", deleteFolderFromDialog);
  elements.downloadBackupButton?.addEventListener("click", downloadNotesBackup);
  elements.restoreBackupButton?.addEventListener("click", () => elements.restoreBackupInput?.click());
  elements.restoreBackupInput?.addEventListener("change", handleBackupRestore);
  elements.logoutButton.addEventListener("click", logoutUser);
  elements.textFormatToolbar?.addEventListener("mousedown", handleTextFormatMouseDown);
  elements.textFormatToolbar?.addEventListener("click", handleTextFormatClick);
  elements.formatSizeMenu?.addEventListener("mousedown", preserveRichTextMenuSelection);
  elements.formatSizeMenu?.addEventListener("click", handleFormatSizeMenuClick);
  elements.textFormatMenu?.addEventListener("mousedown", preserveRichTextMenuSelection);
  elements.textFormatMenu?.addEventListener("click", handleTextFormatMenuClick);
  elements.siteContextMenu?.addEventListener("click", handleSiteContextMenuClick);
  document.addEventListener("selectionchange", handleRichSelectionChange);
  document.addEventListener("click", (event) => {
    const toolbarAction = event.target.closest("[data-toolbar-menu]");
    if (toolbarAction) {
      handleToolbarMenuAction(toolbarAction.dataset.toolbarMenu);
      return;
    }

    if (!event.target.closest("#mobileMoreMenu, #mobileMoreButton")) closeMobileMoreMenu();
    if (!event.target.closest("#mobileNoteActionMenu")) closeMobileNoteActionMenu();
    if (!event.target.closest("#mobileFolderMoveMenu")) closeMobileFolderMoveMenu();
    if (!event.target.closest("#siteContextMenu")) closeSiteContextMenu();
    if (!event.target.closest("#formatSizeMenu, #formatSizeButton")) closeFormatSizeMenu();
    if (!event.target.closest("#textFormatMenu")) closeTextFormatMenu();

    if (!event.target.closest("#toolbarContextMenu")) closeToolbarContextMenu();
    if (!event.target.closest("#themeDropdown")) closeThemeMenu();

    const accountSwitch = event.target.closest("[data-account-switch]");
    if (accountSwitch) setActiveAccountPanel(accountSwitch.dataset.accountSwitch);
  });
  document.addEventListener("contextmenu", handleAppContextMenu);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeToolbarContextMenu();
      closeSiteContextMenu();
      closeFormatSizeMenu();
      closeTextFormatMenu();
      closeThemeMenu();
      closeCreateTypeModal();
      closeDrawingTool();
      closeModals();
    }
  });

  elements.createMenuButton.addEventListener("click", handleCreateMenuButtonClick);
  elements.createTypeLayer.addEventListener("click", handleCreateTypeLayerClick);
  elements.sidebarCollapseButton.addEventListener("click", toggleSidebarCollapsed);
  elements.addFolderButton.addEventListener("click", createFolder);

  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      currentView = button.dataset.view;
      selectedNoteId = getVisibleNotes()[0]?.id ?? null;
      if (isMobileLayout()) {
        showMobileScreen("list");
      } else {
        closeSidebar();
      }
      render();
    });

    button.addEventListener("dragover", (event) => {
      if (!draggedNoteId) return;
      event.preventDefault();
      button.classList.add("drag-over");
      event.dataTransfer.dropEffect = "move";
    });

    button.addEventListener("dragleave", () => button.classList.remove("drag-over"));

    button.addEventListener("drop", (event) => {
      if (!draggedNoteId) return;
      event.preventDefault();
      button.classList.remove("drag-over");
      moveDraggedNoteToView(button.dataset.view);
    });
  });

  elements.searchInput.addEventListener("input", () => {
    if (elements.mobileSearchInput.value !== elements.searchInput.value) elements.mobileSearchInput.value = elements.searchInput.value;
    selectedNoteId = getVisibleNotes()[0]?.id ?? null;
    renderNotes();
    renderEditor();
  });
  elements.mobileSearchInput.addEventListener("input", () => {
    if (elements.searchInput.value !== elements.mobileSearchInput.value) elements.searchInput.value = elements.mobileSearchInput.value;
    selectedNoteId = getVisibleNotes()[0]?.id ?? null;
    renderNotes();
    renderEditor();
  });

  elements.emptyTrashButton.addEventListener("click", emptyTrash);
  elements.noteTypeButton.addEventListener("click", () => updateNoteType("note"));
  elements.checklistTypeButton.addEventListener("click", () => updateNoteType("checklist"));
  elements.shoppingTypeButton.addEventListener("click", () => updateNoteType("shopping"));
  elements.goalTypeButton.addEventListener("click", () => updateNoteType("goal"));
  elements.finalizeNoteButton.addEventListener("click", toggleFinalizeSelectedNote);
  elements.pinButton.addEventListener("click", togglePin);
  elements.archiveButton.addEventListener("click", archiveSelectedNote);
  elements.deleteButton.addEventListener("click", deleteSelectedNote);
  elements.restoreButton.addEventListener("click", restoreSelectedNote);
  elements.drawButton.addEventListener("click", openPageDrawingTool);
  elements.drawingBlockButton.addEventListener("click", createDrawingBlock);
  elements.closeDrawToolButton.addEventListener("click", closeDrawingTool);
  elements.minimizeDrawToolButton.addEventListener("click", toggleDrawToolMinimized);
  elements.drawToolHead.addEventListener("pointerdown", startDrawToolDrag);
  document.addEventListener("pointermove", moveDrawToolDrag);
  document.addEventListener("pointerup", endDrawToolDrag);
  document.addEventListener("pointercancel", endDrawToolDrag);
  elements.finishDrawingButton.addEventListener("click", closeDrawingTool);
  elements.undoDrawingButton.addEventListener("click", undoDrawingStroke);
  elements.redoDrawingButton.addEventListener("click", redoDrawingStroke);
  elements.clearDrawingButton.addEventListener("click", clearActiveDrawing);
  elements.drawModeRow.addEventListener("click", handleDrawModeClick);
  elements.drawColorOptions.addEventListener("click", handleDrawColorClick);
  elements.drawWidthInput.addEventListener("input", handleDrawWidthInput);
  elements.editorDrawingCanvas.addEventListener("pointerdown", startEditorDrawing);
  elements.editorDrawingCanvas.addEventListener("pointermove", moveEditorDrawing);
  elements.editorDrawingCanvas.addEventListener("pointerup", endEditorDrawing);
  elements.editorDrawingCanvas.addEventListener("pointercancel", endEditorDrawing);
  window.addEventListener("resize", scheduleEditorCanvasRender);
  elements.mediaInput.addEventListener("change", addMediaAttachments);
  elements.checklistImageInput.addEventListener("change", addChecklistItemImage);

  elements.titleInput.addEventListener("input", () => {
    updateSelectedNote((note) => {
      note.title = elements.titleInput.value;
    }, { renderEditor: false });
  });

  elements.bodyInput.addEventListener("input", () => {
    updateSelectedNote((note) => {
      note.content = elements.bodyInput.value;
    }, { renderEditor: false });
  });

  elements.folderSelect.addEventListener("change", () => {
    updateSelectedNote((note) => {
      note.folderId = elements.folderSelect.value;
    });
    showToast("Nota movida");
  });

  elements.addItemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addChecklistItem();
  });

  elements.currencySelect.addEventListener("change", () => {
    updateSelectedNote((note) => {
      note.currency = elements.currencySelect.value;
    });
  });

  elements.addShoppingItemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addShoppingItem();
  });

  elements.goalNameInput.addEventListener("input", () => updateGoalData({ name: elements.goalNameInput.value }, { syncTitle: true, renderEditor: false }));
  elements.goalTargetInput.addEventListener("input", () => updateGoalData({ target: normalizeNumber(elements.goalTargetInput.value, 0) }, { renderEditor: false }));
  elements.goalSavedInput.addEventListener("input", () => updateGoalData({ saved: normalizeNumber(elements.goalSavedInput.value, 0) }, { renderEditor: false }));
  elements.goalCategoryInput.addEventListener("input", () => updateGoalData({ category: elements.goalCategoryInput.value }, { renderEditor: false }));
  elements.goalStartDateInput.addEventListener("change", () => updateGoalData({ startDate: elements.goalStartDateInput.value }));
  elements.goalHasDeadlineInput.addEventListener("change", () => updateGoalData({ hasTargetDate: elements.goalHasDeadlineInput.checked }));
  elements.goalTargetDateInput.addEventListener("change", () => updateGoalData({ targetDate: elements.goalTargetDateInput.value }));
  if (elements.goalNotifyInput) elements.goalNotifyInput.addEventListener("change", () => updateGoalData({ notify: false }));
  elements.goalSummary.addEventListener("click", handleGoalSummaryAction);
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 680px)").matches;
}

function setupMobileLayout() {
  mobileScreen = isMobileLayout() ? "folders" : "desktop";
  updateMobileLayoutState();
  window.addEventListener("resize", () => {
    if (isMobileLayout() && mobileScreen === "desktop") mobileScreen = "folders";
    if (!isMobileLayout()) mobileScreen = "desktop";
    updateMobileLayoutState();
  });
}

function showMobileScreen(screen) {
  if (!isMobileLayout()) return;
  mobileScreen = ["folders", "list", "editor"].includes(screen) ? screen : "folders";
  closeMobileMoreMenu();
  closeMobileNoteActionMenu();
  updateMobileLayoutState();
  window.scrollTo({ top: 0, behavior: "auto" });
}

function updateMobileLayoutState() {
  const mobile = isMobileLayout();
  const isTrashList = mobile && mobileScreen === "list" && currentView === "trash";
  document.body.classList.toggle("mobile-layout", mobile);
  document.body.classList.toggle("mobile-screen-folders", mobile && mobileScreen === "folders");
  document.body.classList.toggle("mobile-screen-list", mobile && mobileScreen === "list");
  document.body.classList.toggle("mobile-screen-editor", mobile && mobileScreen === "editor");
  document.body.classList.toggle("mobile-view-trash", isTrashList);
  document.body.classList.toggle("mobile-note-editing", mobile && mobileScreen === "editor" && Boolean(getSelectedNote() && !getSelectedNote().finalized && !getSelectedNote().trashed));
  document.body.classList.toggle("mobile-note-finalized", mobile && mobileScreen === "editor" && Boolean(getSelectedNote()?.finalized));
  document.body.classList.toggle("mobile-note-trash", mobile && mobileScreen === "editor" && Boolean(getSelectedNote()?.trashed));
  document.body.classList.toggle("mobile-settings-page", mobile && elements.settingsModal && !elements.settingsModal.hidden);
  placeTextFormatToolbar();

  if (!mobile) {
    elements.sidebar.style.transform = "";
    elements.sidebar.style.position = "";
    elements.sidebar.style.inset = "";
    elements.sidebar.style.width = "";
    elements.sidebar.style.height = "";
    document.documentElement.style.removeProperty("--mobile-topbar-height");
    updateCreateMenuButtonMode(false);
    return;
  }

  if (mobileScreen === "folders") {
    elements.sidebar.style.transform = "none";
    elements.sidebar.style.position = "relative";
    elements.sidebar.style.inset = "auto";
    elements.sidebar.style.width = "100%";
    elements.sidebar.style.height = "100svh";
  } else {
    elements.sidebar.style.transform = "";
    elements.sidebar.style.position = "";
    elements.sidebar.style.inset = "";
    elements.sidebar.style.width = "";
    elements.sidebar.style.height = "";
  }

  const previousLabel = mobileScreen === "editor" ? getViewTitle() : "Pastas";
  elements.mobileBackLabel.textContent = previousLabel;
  elements.mobileEditButton.hidden = !(mobileScreen === "editor" && getSelectedNote() && getSelectedNote().finalized && !getSelectedNote().trashed);
  elements.mobileFinishButton.hidden = !(mobileScreen === "editor" && getSelectedNote() && !getSelectedNote().finalized && !getSelectedNote().trashed);
  elements.mobileMoreButton.hidden = mobileScreen !== "list";
  if (elements.mobileSearchInput.value !== elements.searchInput.value) elements.mobileSearchInput.value = elements.searchInput.value;
  updateCreateMenuButtonMode(isTrashList);
  queueMobileTopbarHeightUpdate();
}

function updateCreateMenuButtonMode(isTrashList) {
  const icon = elements.createMenuButton.querySelector("svg:first-child use");
  const label = elements.createMenuButton.querySelector(".mobile-create-label");
  const trashedCount = state.notes.filter((note) => note.trashed).length;

  elements.createMenuButton.classList.toggle("trash-action", Boolean(isTrashList));
  elements.createMenuButton.disabled = Boolean(isTrashList && trashedCount === 0);
  elements.createMenuButton.setAttribute("aria-label", isTrashList ? "Esvaziar lixeira" : "Criar nota");
  elements.createMenuButton.title = isTrashList ? "Esvaziar lixeira" : "Criar nota";
  if (icon) icon.setAttribute("href", isTrashList ? "#icon-trash" : "#icon-plus");
  if (label) label.textContent = isTrashList ? "Esvaziar" : "Nova";
}

function updateMobileTopbarHeight() {
  if (!isMobileLayout()) return;
  const height = Math.ceil(elements.topbar?.getBoundingClientRect().height || 58);
  document.documentElement.style.setProperty("--mobile-topbar-height", `${Math.max(58, height)}px`);
}

function queueMobileTopbarHeightUpdate() {
  if (!isMobileLayout()) return;
  requestAnimationFrame(updateMobileTopbarHeight);
  requestAnimationFrame(() => requestAnimationFrame(updateMobileTopbarHeight));
}

function handleCreateMenuButtonClick(event) {
  if (isMobileLayout() && mobileScreen === "list" && currentView === "trash") {
    event.preventDefault();
    closeCreateTypeModal();
    emptyTrash();
    return;
  }
  openCreateTypeModal(event);
}

function handleMobileBack() {
  if (!isMobileLayout()) return;
  if (!elements.settingsModal.hidden) {
    closeModals();
    return;
  }
  if (mobileScreen === "editor") {
    showMobileScreen("list");
    return;
  }
  if (mobileScreen === "list") {
    showMobileScreen("folders");
  }
}

function toggleMobileMoreMenu(event) {
  event.stopPropagation();
  if (!isMobileLayout()) return;
  elements.mobileMoreMenu.hidden = !elements.mobileMoreMenu.hidden;
}

function closeMobileMoreMenu() {
  if (elements.mobileMoreMenu) elements.mobileMoreMenu.hidden = true;
}

function handleMobileMoreMenuClick(event) {
  const action = event.target.closest("[data-mobile-menu]")?.dataset.mobileMenu;
  if (!action) return;
  closeMobileMoreMenu();
  if (action === "settings") {
    mobileSettingsReturnScreen = mobileScreen;
    openSettingsModal("profile");
  }
  if (action === "account") {
    if (getCurrentUser()) {
      mobileSettingsReturnScreen = mobileScreen;
      openSettingsModal("profile");
    } else {
      openAccountModal("login");
    }
  }
}

function enableMobileNoteEditing() {
  const note = getSelectedNote();
  if (!note || note.trashed) return;
  if (note.finalized) {
    note.finalized = false;
    note.updatedAt = Date.now();
    saveState();
    render();
    showToast("Modo de edição ativado");
  }
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return normalizeState(parsed);
    } catch (error) {
      console.warn("Estado salvo inválido. Criando novo estado.", error);
    }
  }

  return normalizeState(getDefaultInitialState());
}

function getDefaultInitialState() {
  const fallback = {
    folders: [
      { id: "personal", name: "Pessoal", order: 0, color: "#b98500" },
      { id: "work", name: "Trabalho", order: 1, color: "#b98500" },
    ],
    notes: [],
  };
  const source = window.NOTI_DEFAULT_STATE || fallback;
  const cloned = JSON.parse(JSON.stringify(source));
  const seededAt = Number.isFinite(source.seededAt) ? source.seededAt : 0;
  const offset = seededAt ? Date.now() - seededAt : 0;
  if (offset) shiftStateTimestamps(cloned, offset);
  return cloned;
}

function shiftStateTimestamps(value, offset) {
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, item]) => {
    if ((key === "createdAt" || key === "updatedAt") && Number.isFinite(item)) {
      value[key] = Math.max(0, item + offset);
      return;
    }
    if (item && typeof item === "object") shiftStateTimestamps(item, offset);
  });
}

function normalizeState(rawState) {
  const folders = Array.isArray(rawState?.folders) ? rawState.folders : [];
  const notes = Array.isArray(rawState?.notes) ? rawState.notes : [];

  return {
    folders: folders
      .filter((folder) => folder?.id && typeof folder.name === "string")
      .map((folder, index) => ({
        id: String(folder.id),
        name: folder.name.trim() || "Nova pasta",
        order: Number.isFinite(folder.order) ? folder.order : index,
        color: normalizeAccent(folder.color || "#007aff"),
      }))
      .sort((a, b) => a.order - b.order),
    notes: notes.map((note, index) => ({
      id: note.id || cryptoId(),
      type: normalizeNoteType(note.type),
      title: typeof note.title === "string" ? note.title : "",
      content: typeof note.content === "string" ? note.content : "",
      items: Array.isArray(note.items)
        ? note.items.map((item) => ({
            id: item.id || cryptoId(),
            text: typeof item.text === "string" ? item.text : "",
            html: typeof item.html === "string" ? sanitizeRichHtml(item.html) : "",
            done: Boolean(item.done),
            image: normalizeInlineImage(item.image),
          }))
        : [],
      attachments: Array.isArray(note.attachments)
        ? note.attachments
            .filter((attachment) => attachment?.dataUrl && attachment?.id)
            .map((attachment) => ({
              id: String(attachment.id),
              name: typeof attachment.name === "string" ? attachment.name : "Anexo",
              type: typeof attachment.type === "string" ? attachment.type : "application/octet-stream",
              size: Number.isFinite(attachment.size) ? attachment.size : 0,
              dataUrl: attachment.dataUrl,
              createdAt: Number.isFinite(attachment.createdAt) ? attachment.createdAt : Date.now(),
            }))
        : [],
      blocks: normalizeNoteBlocks(note),
      pageDrawings: normalizeDrawingStrokes(note.pageDrawings),
      drawingBlocks: normalizeDrawingBlocks(note.drawingBlocks),
      shoppingItems: Array.isArray(note.shoppingItems)
        ? note.shoppingItems.map((item) => ({
            id: item.id || cryptoId(),
            text: typeof item.text === "string" ? item.text : "",
            html: typeof item.html === "string" ? sanitizeRichHtml(item.html) : "",
            done: Boolean(item.done),
            quantity: normalizeNumber(item.quantity, 1),
            price: normalizeNumber(item.price, 0),
            image: normalizeInlineImage(item.image),
          }))
        : [],
      goal: normalizeGoal(note.goal, note),
      currency: typeof note.currency === "string" ? note.currency : "BRL",
      folderId: note.folderId || "",
      pinned: Boolean(note.pinned),
      trashed: Boolean(note.trashed),
      archived: Boolean(note.archived),
      finalized: Boolean(note.finalized),
      order: Number.isFinite(note.order) ? note.order : index,
      createdAt: Number.isFinite(note.createdAt) ? note.createdAt : Date.now(),
      updatedAt: Number.isFinite(note.updatedAt) ? note.updatedAt : Date.now(),
    })),
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  ensureSelection();
  renderSidebar();
  renderNotes();
  renderEditor();
  renderSettingsIfOpen();
  updateMobileLayoutState();
}

function renderSidebar() {
  const activeNotes = state.notes.filter((note) => !note.trashed && !note.archived);
  if (elements.sidebarNoteCount) elements.sidebarNoteCount.textContent = activeNotes.length;
  elements.allCount.textContent = activeNotes.length;
  elements.pinnedCount.textContent = activeNotes.filter((note) => note.pinned).length;
  elements.trashCount.textContent = state.notes.filter((note) => note.trashed).length;

  $$(".nav-item").forEach((button) => {
    button.classList.toggle("active", currentView === button.dataset.view);
  });

  elements.folderList.replaceChildren();
  state.folders
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((folder) => {
      const button = document.createElement("button");
      const count = state.notes.filter((note) => !note.trashed && !note.archived && note.folderId === folder.id).length;
      button.className = "folder-item";
      button.type = "button";
      button.dataset.folderId = folder.id;
      button.title = folder.name;
      button.style.setProperty("--folder-color", folder.color || preferences.defaultFolderColor);
      button.innerHTML = `
        <span>
          <svg><use href="#icon-folder"></use></svg>
          <span class="folder-name"></span>
        </span>
        <strong class="folder-count">${count}</strong>
      `;
      button.querySelector(".folder-name").textContent = folder.name;
      button.classList.toggle("active", currentView === `folder:${folder.id}`);

      button.addEventListener("click", () => {
        currentView = `folder:${folder.id}`;
        selectedNoteId = getVisibleNotes()[0]?.id ?? null;
        if (isMobileLayout()) {
          showMobileScreen("list");
        } else {
          closeSidebar();
        }
        render();
      });

      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        editFolder(folder.id);
      });

      button.addEventListener("dragover", (event) => {
        event.preventDefault();
        button.classList.add("drag-over");
      });

      button.addEventListener("dragleave", () => {
        button.classList.remove("drag-over");
      });

      button.addEventListener("drop", (event) => {
        event.preventDefault();
        button.classList.remove("drag-over");
        moveDraggedNoteToFolder(folder.id);
      });

      button.title = "Clique para abrir. Clique direito para renomear.";
      elements.folderList.append(button);
    });
}

function renderNotes() {
  const visibleNotes = getVisibleNotes();
  const selectedStillVisible = visibleNotes.some((note) => note.id === selectedNoteId);

  if (!selectedStillVisible) {
    selectedNoteId = visibleNotes[0]?.id ?? null;
  }

  elements.notesList.replaceChildren();
  elements.emptyState.hidden = visibleNotes.length > 0;
  elements.viewTitle.textContent = getViewTitle();
  elements.currentScope.textContent = getViewScope();
  elements.viewMeta.textContent = `${visibleNotes.length} ${visibleNotes.length === 1 ? "nota" : "notas"}`;
  const noteCountText = visibleNotes.length + " " + (visibleNotes.length === 1 ? "nota" : "notas");
  if (elements.topbarTitle) elements.topbarTitle.textContent = getViewTitle();
  if (elements.topbarMeta) elements.topbarMeta.textContent = noteCountText;
  elements.emptyTrashButton.hidden = currentView !== "trash" || visibleNotes.length === 0;

  let currentGroup = "";
  visibleNotes.forEach((note) => {
    const group = getDateGroup(note.createdAt);
    if (group !== currentGroup) {
      currentGroup = group;
      const heading = document.createElement("p");
      heading.className = "date-group";
      heading.textContent = group;
      elements.notesList.append(heading);
    }

    const card = elements.noteCardTemplate.content.firstElementChild.cloneNode(true);
    const folder = getFolder(note.folderId);
    card.dataset.noteId = note.id;
    card.classList.toggle("active", note.id === selectedNoteId);
    card.querySelector(".note-kind").textContent = getNoteKindLabel(note);
    card.querySelector(".note-pin").hidden = !note.pinned;
    card.querySelector("h3").textContent = note.title.trim() || "Sem título";
    card.querySelector("p").textContent = getNotePreview(note);
    if (note.type === "goal") renderGoalNoteCard(card, note);
    card.querySelector(".note-folder").textContent = folder?.name || "Sem pasta";
    card.querySelector(".note-date").textContent = formatNoteDate(note.createdAt);
    const modified = card.querySelector(".note-modified");
    if (modified) {
      modified.textContent = `Editada ${formatNoteDate(note.updatedAt)}`;
      modified.title = `Criada em ${formatFullDateTime(note.createdAt)} · Editada em ${formatFullDateTime(note.updatedAt)}`;
    }
    renderNoteThumbnail(card, note);

    card.addEventListener("click", () => {
      if (mobileNotePointer?.handled) {
        mobileNotePointer = null;
        return;
      }
      selectedNoteId = note.id;
      if (isMobileLayout()) showMobileScreen("editor");
      renderNotes();
      renderEditor();
    });

    bindMobileNoteGestures(card, note);

    card.addEventListener("dragstart", (event) => {
      draggedNoteId = note.id;
      card.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", note.id);
    });

    card.addEventListener("dragend", () => {
      draggedNoteId = null;
      card.classList.remove("dragging");
    });

    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });

    card.addEventListener("drop", (event) => {
      event.preventDefault();
      reorderDraggedNote(note.id);
    });

    elements.notesList.append(card);
  });
}

function bindMobileNoteGestures(card, note) {
  card.addEventListener("pointerdown", (event) => {
    if (!isMobileLayout() || event.button !== 0) return;
    closeMobileNoteActionMenu();
    mobileNotePointer = {
      noteId: note.id,
      startX: event.clientX,
      startY: event.clientY,
      currentX: event.clientX,
      handled: false,
      card,
    };
    mobileNotePressTimer = window.setTimeout(() => {
      if (!mobileNotePointer || mobileNotePointer.noteId !== note.id) return;
      const dx = Math.abs(mobileNotePointer.currentX - mobileNotePointer.startX);
      if (dx > 12) return;
      mobileNotePointer.handled = true;
      showMobileNoteActionMenu(note.id, card);
    }, 520);
  });

  card.addEventListener("pointermove", (event) => {
    if (!mobileNotePointer || mobileNotePointer.noteId !== note.id) return;
    const dx = event.clientX - mobileNotePointer.startX;
    const dy = event.clientY - mobileNotePointer.startY;
    mobileNotePointer.currentX = event.clientX;
    if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) {
      clearTimeout(mobileNotePressTimer);
      return;
    }
    if (Math.abs(dx) > 10) clearTimeout(mobileNotePressTimer);
    if (Math.abs(dx) > 6) {
      card.classList.add("swiping");
      card.style.transform = `translateX(${Math.max(-86, Math.min(86, dx))}px)`;
      card.dataset.swipeAction = dx > 0 ? "fixar" : "arquivar";
    }
  });

  card.addEventListener("pointerup", (event) => {
    if (!mobileNotePointer || mobileNotePointer.noteId !== note.id) return;
    clearTimeout(mobileNotePressTimer);
    const dx = event.clientX - mobileNotePointer.startX;
    const handledByMenu = mobileNotePointer.handled;
    resetMobileSwipeCard(card);
    mobileNotePointer.handled = handledByMenu || Math.abs(dx) > 78;
    if (handledByMenu) return;
    if (dx > 78) {
      pinNoteById(note.id, true);
      return;
    }
    if (dx < -78 && currentView !== "trash") {
      archiveNoteById(note.id);
    }
  });

  card.addEventListener("pointercancel", () => {
    clearTimeout(mobileNotePressTimer);
    resetMobileSwipeCard(card);
    mobileNotePointer = null;
  });
}

function resetMobileSwipeCard(card) {
  card.classList.remove("swiping");
  card.style.transform = "";
  delete card.dataset.swipeAction;
}

function showMobileNoteActionMenu(noteId, card, point = null) {
  closeMobileFolderMoveMenu();
  closeSiteContextMenu();
  mobileNoteMenuTargetId = noteId;
  const note = state.notes.find((candidate) => candidate.id === noteId);
  if (!note) return;
  elements.mobileNoteActionMenu.querySelector('[data-mobile-note-action="restore"]').hidden = !note.trashed;
  elements.mobileNoteActionMenu.querySelector('[data-mobile-note-action="pin"]').hidden = note.trashed;
  elements.mobileNoteActionMenu.querySelector('[data-mobile-note-action="archive"]').hidden = note.trashed;
  elements.mobileNoteActionMenu.querySelector('[data-mobile-note-action="move"]').hidden = note.trashed;
  elements.mobileNoteActionMenu.querySelector('[data-mobile-note-action="edit"]').hidden = note.trashed;
  elements.mobileNoteActionMenu.querySelector('[data-mobile-note-action="delete"]').hidden = note.trashed;
  elements.mobileNoteActionMenu.querySelector('[data-mobile-note-action="pin"] span').textContent = note.pinned ? "Desafixar" : "Fixar";
  elements.mobileNoteActionMenu.hidden = false;
  elements.mobileNoteActionMenu.style.left = "0px";
  elements.mobileNoteActionMenu.style.top = "0px";
  const bounds = elements.mobileNoteActionMenu.getBoundingClientRect();
  const rect = card?.getBoundingClientRect?.();
  const left = point?.x ?? ((rect?.left || 0) + 16);
  const top = point?.y ?? ((rect?.top || 0) + 8);
  elements.mobileNoteActionMenu.style.left = `${Math.max(12, Math.min(window.innerWidth - bounds.width - 12, left))}px`;
  elements.mobileNoteActionMenu.style.top = `${Math.max(12, Math.min(window.innerHeight - bounds.height - 12, top))}px`;
}

function closeMobileNoteActionMenu() {
  if (!elements.mobileNoteActionMenu) return;
  elements.mobileNoteActionMenu.hidden = true;
  mobileNoteMenuTargetId = "";
}

function handleMobileNoteMenuClick(event) {
  event.stopPropagation();
  const action = event.target.closest("[data-mobile-note-action]")?.dataset.mobileNoteAction;
  if (!action || !mobileNoteMenuTargetId) return;
  const noteId = mobileNoteMenuTargetId;
  closeMobileNoteActionMenu();
  if (action === "move") {
    showMobileFolderMoveMenu(noteId);
    return;
  }
  if (action === "pin") pinNoteById(noteId);
  if (action === "archive") archiveNoteById(noteId);
  if (action === "delete") deleteNoteById(noteId);
  if (action === "restore") restoreNoteById(noteId);
  if (action === "edit") {
    const note = state.notes.find((candidate) => candidate.id === noteId);
    if (!note) return;
    selectedNoteId = note.id;
    if (note.finalized) note.finalized = false;
    note.updatedAt = Date.now();
    saveState();
    showMobileScreen("editor");
    render();
  }
}

function showMobileFolderMoveMenu(noteId) {
  if (!isMobileLayout()) return;
  const note = state.notes.find((candidate) => candidate.id === noteId);
  if (!note || note.trashed) return;
  mobileNoteMenuTargetId = noteId;
  elements.mobileFolderMoveMenu.replaceChildren();

  const title = document.createElement("p");
  title.textContent = "Mover para pasta";
  elements.mobileFolderMoveMenu.append(title);

  [{ id: "", name: "Sem pasta", color: preferences.defaultFolderColor }, ...state.folders].forEach((folder) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.mobileFolderId = folder.id;
    button.classList.toggle("active", (note.folderId || "") === folder.id);
    button.innerHTML = `<span class="folder-color-dot"></span><strong></strong>`;
    button.querySelector(".folder-color-dot").style.setProperty("--folder-color", folder.color || preferences.defaultFolderColor);
    button.querySelector("strong").textContent = folder.name;
    elements.mobileFolderMoveMenu.append(button);
  });

  elements.mobileFolderMoveMenu.hidden = false;
  elements.mobileFolderMoveMenu.style.top = "128px";
  elements.mobileFolderMoveMenu.style.right = "12px";
}

function closeMobileFolderMoveMenu() {
  if (!elements.mobileFolderMoveMenu) return;
  elements.mobileFolderMoveMenu.hidden = true;
}

function handleMobileFolderMoveMenuClick(event) {
  event.stopPropagation();
  const button = event.target.closest("[data-mobile-folder-id]");
  if (!button || !mobileNoteMenuTargetId) return;
  moveNoteToFolderById(mobileNoteMenuTargetId, button.dataset.mobileFolderId || "");
  closeMobileFolderMoveMenu();
  closeMobileNoteActionMenu();
}

function handleAppContextMenu(event) {
  if (event.defaultPrevented) return;
  const target = event.target;
  const targetElement = target?.nodeType === Node.ELEMENT_NODE ? target : target?.parentElement;
  const richEditor = targetElement?.closest?.("[data-rich-editor]");
  if (richEditor?.isContentEditable) {
    const range = getCurrentRichSelectionRange(richEditor);
    if (range && !range.collapsed) {
      event.preventDefault();
      rememberRichTextEditor(richEditor);
      showTextFormatMenu(event.clientX, event.clientY, richEditor);
      return;
    }
    if (isMobileLayout()) return;
  }

  if (isMobileLayout()) return;
  if (isNativeEditableTarget(targetElement) || targetElement?.closest?.("#toolbarContextMenu, #mobileNoteActionMenu, #siteContextMenu, #formatSizeMenu, #textFormatMenu, .app-modal, .profile-edit-dialog, .folder-edit-dialog, .draw-tool-popover")) return;

  const noteCard = targetElement?.closest?.(".note-card");
  if (noteCard?.dataset.noteId) {
    event.preventDefault();
    selectedNoteId = noteCard.dataset.noteId;
    renderNotes();
    renderEditor();
    showMobileNoteActionMenu(noteCard.dataset.noteId, noteCard, { x: event.clientX, y: event.clientY });
    return;
  }

  if (targetElement?.closest?.(".notes-panel")) {
    event.preventDefault();
    showSiteContextMenu(event.clientX, event.clientY);
  }
}

function isNativeEditableTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

function showSiteContextMenu(x, y) {
  if (!elements.siteContextMenu) return;
  closeMobileNoteActionMenu();
  closeMobileFolderMoveMenu();
  closeToolbarContextMenu();
  elements.siteContextMenu.hidden = false;
  elements.siteContextMenu.style.left = "0px";
  elements.siteContextMenu.style.top = "0px";
  const bounds = elements.siteContextMenu.getBoundingClientRect();
  elements.siteContextMenu.style.left = `${Math.max(10, Math.min(window.innerWidth - bounds.width - 10, x))}px`;
  elements.siteContextMenu.style.top = `${Math.max(10, Math.min(window.innerHeight - bounds.height - 10, y))}px`;
}

function closeSiteContextMenu() {
  if (elements.siteContextMenu) elements.siteContextMenu.hidden = true;
}

function handleSiteContextMenuClick(event) {
  const action = event.target.closest("[data-site-context-action]")?.dataset.siteContextAction;
  if (!action) return;
  event.stopPropagation();
  closeSiteContextMenu();
  if (action === "new-note") createNote("note");
}

function moveNoteToFolderById(noteId, folderId) {
  const note = state.notes.find((candidate) => candidate.id === noteId);
  if (!note || note.trashed) return;
  note.folderId = folderId;
  note.updatedAt = Date.now();
  selectedNoteId = note.id;
  saveState();
  render();
  showToast(folderId ? "Nota movida para a pasta" : "Nota removida da pasta");
}

function pinNoteById(noteId, forcePinned = null) {
  const note = state.notes.find((candidate) => candidate.id === noteId);
  if (!note || note.trashed) return;
  note.pinned = forcePinned === null ? !note.pinned : Boolean(forcePinned);
  note.updatedAt = Date.now();
  selectedNoteId = note.id;
  saveState();
  render();
  showToast(note.pinned ? "Nota fixada" : "Nota desafixada");
}

function archiveNoteById(noteId) {
  const note = state.notes.find((candidate) => candidate.id === noteId);
  if (!note || note.trashed) return;
  note.archived = true;
  note.pinned = false;
  note.updatedAt = Date.now();
  if (selectedNoteId === note.id) selectedNoteId = getVisibleNotes().find((item) => item.id !== note.id)?.id ?? null;
  saveState();
  render();
  showToast("Nota arquivada");
}

function deleteNoteById(noteId) {
  const note = state.notes.find((candidate) => candidate.id === noteId);
  if (!note) return;
  note.trashed = true;
  note.archived = false;
  note.pinned = false;
  note.updatedAt = Date.now();
  if (selectedNoteId === note.id) selectedNoteId = getVisibleNotes().find((item) => item.id !== note.id)?.id ?? null;
  saveState();
  render();
  showToast("Nota movida para a lixeira");
}

function restoreNoteById(noteId) {
  const note = state.notes.find((candidate) => candidate.id === noteId);
  if (!note) return;
  note.trashed = false;
  note.archived = false;
  note.updatedAt = Date.now();
  currentView = "all";
  selectedNoteId = note.id;
  saveState();
  showMobileScreen("list");
  render();
  showToast("Nota restaurada");
}

function renderEditor() {
  const note = getSelectedNote();
  const hasNote = Boolean(note);

  elements.editor.hidden = !hasNote;
  elements.editorEmpty.hidden = hasNote;

  if (!note) {
    closeDrawingTool();
    queueMobileTopbarHeightUpdate();
    return;
  }

  const isFinalized = Boolean(note.finalized);
  const contentLocked = note.trashed || isFinalized;
  if (!canUseDrawingTools(note) && !elements.drawToolPopover.hidden) closeDrawingTool();

  elements.editor.classList.toggle("finalized", isFinalized);
  elements.editor.classList.toggle("trashed", note.trashed);
  elements.editor.classList.toggle("type-note", note.type === "note");
  elements.editor.classList.toggle("type-checklist", note.type === "checklist");
  elements.editor.classList.toggle("type-shopping", note.type === "shopping");
  elements.editor.classList.toggle("type-goal", note.type === "goal");
  elements.noteTypeButton.classList.toggle("active", note.type === "note");
  elements.checklistTypeButton.classList.toggle("active", note.type === "checklist");
  elements.shoppingTypeButton.classList.toggle("active", note.type === "shopping");
  elements.goalTypeButton.classList.toggle("active", note.type === "goal");
  if (elements.segmentedControl) elements.segmentedControl.hidden = true;
  if (elements.textFormatToolbar) elements.textFormatToolbar.hidden = note.type === "goal" || note.trashed || isFinalized;
  elements.finalizeNoteButton.hidden = note.trashed;
  elements.finalizeNoteButton.disabled = note.trashed;
  elements.finalizeNoteButton.classList.toggle("editing", isFinalized);
  elements.finalizeNoteButton.setAttribute("aria-label", isFinalized ? "Editar nota" : "Finalizar nota");
  elements.finalizeNoteButton.innerHTML = isFinalized
    ? '<svg><use href="#icon-edit"></use></svg>Editar'
    : '<svg><use href="#icon-check"></use></svg>Finalizar';
  elements.pinButton.classList.toggle("active", note.pinned);
  elements.pinButton.setAttribute("aria-label", note.pinned ? "Desafixar nota" : "Fixar nota");
  elements.deleteButton.hidden = note.trashed;
  elements.restoreButton.hidden = !note.trashed;
  elements.noteTypeButton.disabled = contentLocked;
  elements.checklistTypeButton.disabled = contentLocked;
  elements.shoppingTypeButton.disabled = contentLocked;
  elements.goalTypeButton.disabled = contentLocked;
  elements.pinButton.disabled = note.trashed;
  elements.mediaInput.disabled = contentLocked;
  elements.attachButton.classList.toggle("disabled", contentLocked);
  const drawingDisabled = !canUseDrawingTools(note);
  elements.drawButton.disabled = drawingDisabled;
  elements.drawingBlockButton.disabled = drawingDisabled;
  elements.drawButton.classList.toggle("active", !elements.drawToolPopover.hidden && drawingTool.context === "page");
  elements.drawingBlockButton.classList.toggle("active", !elements.drawToolPopover.hidden && drawingTool.context === "block");
  elements.folderSelect.disabled = contentLocked;
  elements.titleInput.disabled = note.trashed;
  elements.titleInput.hidden = note.type === "goal";
  elements.titleInput.readOnly = isFinalized;
  elements.bodyInput.disabled = note.trashed;
  elements.bodyInput.readOnly = isFinalized;
  elements.newItemInput.disabled = contentLocked;
  elements.currencySelect.disabled = contentLocked;
  elements.newShoppingItemInput.disabled = contentLocked;
  elements.newShoppingQtyInput.disabled = contentLocked;
  elements.newShoppingPriceInput.disabled = contentLocked;

  elements.titleInput.value = note.title;
  elements.folderSelect.replaceChildren(
    new Option("Sem pasta", ""),
    ...state.folders
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((folder) => new Option(folder.name, folder.id))
  );
  elements.folderSelect.value = note.folderId || "";
  elements.updatedLabel.textContent = isFinalized ? `Finalizada \u00b7 Editado ${formatRelativeTime(note.updatedAt)}` : `Editado ${formatRelativeTime(note.updatedAt)}`;
  elements.bodyInput.value = note.content;
  elements.bodyInput.hidden = true;
  elements.noteBlockEditor.hidden = note.type !== "note";
  elements.checklistEditor.hidden = note.type !== "checklist";
  elements.shoppingEditor.hidden = note.type !== "shopping";
  elements.goalEditor.hidden = note.type !== "goal";
  elements.currencySelect.value = note.currency || "BRL";

  renderAttachments(note);
  renderNoteBlocks(note);
  renderChecklist(note);
  renderShopping(note);
  renderDrawingBlocks(note);
  renderGoal(note);
  renderTextFormatToolbar(note);
  scheduleEditorCanvasRender();
  queueMobileTopbarHeightUpdate();
}

function renderAttachments(note) {
  elements.attachmentsPanel.replaceChildren();
  const inlineImageIds = new Set((note.blocks || []).filter((block) => block.type === "image").map((block) => block.attachmentId));
  const visibleAttachments = note.attachments.filter((attachment) => {
    if (note.type === "note" && attachment.type.startsWith("image/")) return false;
    return !inlineImageIds.has(attachment.id);
  });
  elements.attachmentsPanel.hidden = visibleAttachments.length === 0;

  visibleAttachments.forEach((attachment) => {
    const item = document.createElement("article");
    item.className = "attachment-item";

    const isInteractiveMedia = attachment.type.startsWith("video/") || attachment.type.startsWith("audio/");
    const preview = document.createElement(isInteractiveMedia ? "div" : "a");
    preview.className = "attachment-preview";
    preview.title = attachment.name;
    if (!isInteractiveMedia) {
      preview.href = attachment.dataUrl;
      preview.download = attachment.name;
    }

    if (attachment.type.startsWith("image/")) {
      const image = document.createElement("img");
      image.src = attachment.dataUrl;
      image.alt = attachment.name;
      preview.append(image);
    } else if (attachment.type.startsWith("video/")) {
      const video = document.createElement("video");
      video.src = attachment.dataUrl;
      video.controls = true;
      preview.append(video);
    } else if (attachment.type.startsWith("audio/")) {
      preview.classList.add("attachment-file");
      preview.innerHTML = `<svg><use href="#icon-paperclip"></use></svg>`;
      const audio = document.createElement("audio");
      audio.src = attachment.dataUrl;
      audio.controls = true;
      preview.append(audio);
    } else {
      preview.classList.add("attachment-file");
      preview.innerHTML = `<svg><use href="#icon-file"></use></svg>`;
    }

    const meta = document.createElement("div");
    meta.className = "attachment-meta";
    meta.innerHTML = `
      <strong></strong>
      <span>${formatFileSize(attachment.size)}</span>
    `;
    meta.querySelector("strong").textContent = attachment.name;

    const remove = document.createElement("button");
    remove.className = "icon-button danger small";
    remove.type = "button";
    remove.disabled = note.trashed || note.finalized;
    remove.hidden = note.finalized;
    remove.setAttribute("aria-label", "Remover anexo");
    remove.innerHTML = `<svg><use href="#icon-x"></use></svg>`;
    remove.addEventListener("click", () => removeAttachment(attachment.id));

    item.append(preview, meta, remove);
    elements.attachmentsPanel.append(item);
  });
}

function renderNoteBlocks(note) {
  elements.noteBlockEditor.replaceChildren();
  if (note.type !== "note") return;
  ensureNoteTextBlock(note);

  let index = 0;
  while (index < note.blocks.length) {
    const block = note.blocks[index];

    if (block.type === "image") {
      const imageBlocks = [];
      while (index < note.blocks.length && note.blocks[index].type === "image") {
        imageBlocks.push(note.blocks[index]);
        index += 1;
      }
      renderNoteImageGrid(note, imageBlocks);
      continue;
    }

    renderNoteTextBlock(note, block);
    index += 1;
  }
}

function renderNoteTextBlock(note, block) {
  const wrapper = document.createElement("section");
  wrapper.className = "note-content-block note-text-wrapper";
  wrapper.dataset.blockIds = block.id;
  wrapper.innerHTML = note.finalized
    ? `<div class="note-text-block note-text-display" aria-label="Texto da nota"></div>`
    : `
      <button class="block-drag-handle" type="button" draggable="true" aria-label="Mover bloco de texto"><svg><use href="#icon-grip"></use></svg></button>
      <div class="note-text-block note-rich-editor" data-rich-editor data-rich-kind="note" data-block-id="${block.id}" contenteditable="true" spellcheck="true" role="textbox" aria-label="Texto da nota" data-placeholder="Comece a escrever..."></div>
    `;

  const handle = wrapper.querySelector(".block-drag-handle");
  const editor = wrapper.querySelector("[data-rich-editor]");
  const display = wrapper.querySelector(".note-text-display");

  if (display) {
    display.innerHTML = getRichBlockHtml(block);
    elements.noteBlockEditor.append(wrapper);
    return;
  }

  editor.innerHTML = getRichBlockHtml(block);
  editor.contentEditable = String(!note.trashed && !note.finalized);
  handle.hidden = note.trashed;
  handle.draggable = canEditNoteContent(note);
  attachNoteBlockDropHandlers(wrapper, [block.id]);
  attachNoteBlockDragHandle(handle, [block.id]);

  bindRichTextEditor(editor);

  elements.noteBlockEditor.append(wrapper);
}
function renderNoteImageGrid(note, imageBlocks) {
  const wrapper = document.createElement("section");
  wrapper.className = "note-content-block note-image-wrapper";
  const blockIds = imageBlocks.map((block) => block.id);
  wrapper.dataset.blockIds = blockIds.join(",");
  wrapper.innerHTML = `
    <button class="block-drag-handle image-drag-handle" type="button" draggable="true" aria-label="Mover bloco de imagem"><svg><use href="#icon-grip"></use></svg></button>
    <div class="note-image-grid"></div>
  `;
  const handle = wrapper.querySelector(".block-drag-handle");
  const grid = wrapper.querySelector(".note-image-grid");
  grid.classList.toggle("single", imageBlocks.length === 1);
  handle.hidden = note.trashed || note.finalized;
  handle.draggable = canEditNoteContent(note);
  attachNoteBlockDropHandlers(wrapper, blockIds);
  attachNoteBlockDragHandle(handle, blockIds);

  imageBlocks.forEach((block) => {
    const attachment = getAttachment(note, block.attachmentId);
    if (!attachment) return;

    const figure = document.createElement("figure");
    figure.className = "note-image-block";
    figure.innerHTML = `
      <img alt="" />
      <button class="icon-button danger small" type="button" aria-label="Remover imagem">
        <svg><use href="#icon-x"></use></svg>
      </button>
    `;
    figure.querySelector("img").src = attachment.dataUrl;
    const removeButton = figure.querySelector("button");
    removeButton.disabled = note.trashed || note.finalized;
    removeButton.hidden = note.finalized;
    removeButton.addEventListener("click", () => removeNoteImageBlock(block.id));
    grid.append(figure);
  });

  elements.noteBlockEditor.append(wrapper);
}
function renderChecklist(note) {
  elements.checklistItems.replaceChildren();

  const total = note.items.length;
  const done = note.items.filter((item) => item.done).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  elements.progressFill.style.width = `${progress}%`;
  elements.progressText.textContent = `${progress}%`;

  note.items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "check-item";
    row.dataset.itemId = item.id;
    row.classList.toggle("done", item.done);
    row.innerHTML = `
      <div class="check-item-main">
        <button class="block-drag-handle item-drag-handle" type="button" draggable="true" aria-label="Mover item"><svg><use href="#icon-grip"></use></svg></button>
        <input type="checkbox" aria-label="Marcar item" />
        <div class="item-rich-text" data-rich-editor data-rich-kind="checklist" data-item-id="${item.id}" contenteditable="true" spellcheck="true" role="textbox" aria-label="Texto do item" data-placeholder="Item do checklist"></div>
        <button class="icon-button checklist-image-button" type="button" aria-label="Adicionar imagem ao item">
          <svg><use href="#icon-image"></use></svg>
        </button>
        <button class="icon-button danger" type="button" aria-label="Remover item">
          <svg><use href="#icon-x"></use></svg>
        </button>
      </div>
      <div class="check-item-image" hidden>
        <img alt="" />
        <button class="icon-button danger small" type="button" aria-label="Remover imagem do item">
          <svg><use href="#icon-x"></use></svg>
        </button>
      </div>
    `;

    const dragHandle = row.querySelector(".item-drag-handle");
    const checkbox = row.querySelector('input[type="checkbox"]');
    const textEditor = row.querySelector("[data-rich-editor]");
    const imageButton = row.querySelector(".checklist-image-button");
    const removeButton = row.querySelector('.check-item-main button[aria-label="Remover item"]');
    const imageWrap = row.querySelector(".check-item-image");
    const itemImage = imageWrap.querySelector("img");
    const removeImageButton = imageWrap.querySelector("button");

    checkbox.checked = item.done;
    checkbox.disabled = note.trashed;
    textEditor.innerHTML = getRichItemHtml(item);
    textEditor.contentEditable = String(!note.trashed && !note.finalized);
    imageButton.disabled = note.trashed || note.finalized;
    imageButton.hidden = note.finalized;
    removeButton.disabled = note.trashed || note.finalized;
    removeButton.hidden = note.finalized;
    removeImageButton.disabled = note.trashed || note.finalized;
    removeImageButton.hidden = note.finalized;
    dragHandle.hidden = note.trashed || note.finalized;
    dragHandle.draggable = canEditNoteContent(note);
    attachListItemDragHandlers(row, dragHandle, "checklist", item.id);

    if (item.image?.dataUrl) {
      imageWrap.hidden = false;
      itemImage.src = item.image.dataUrl;
    }

    checkbox.addEventListener("change", () => {
      updateChecklistItem(item.id, { done: checkbox.checked });
    });

    bindRichTextEditor(textEditor);

    imageButton.addEventListener("click", () => openChecklistImagePicker(item.id));
    removeImageButton.addEventListener("click", () => updateChecklistItem(item.id, { image: null }));

    removeButton.addEventListener("click", () => {
      removeChecklistItem(item.id);
    });

    elements.checklistItems.append(row);
  });
}

function renderShopping(note) {
  elements.shoppingItems.replaceChildren();
  updateShoppingTotal(note);

  note.shoppingItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "shopping-item";
    row.dataset.itemId = item.id;
    row.classList.toggle("done", item.done);
    row.classList.toggle("has-image", Boolean(item.image?.dataUrl));
    row.innerHTML = `
      <button class="block-drag-handle item-drag-handle" type="button" draggable="true" aria-label="Mover compra"><svg><use href="#icon-grip"></use></svg></button>
      <input type="checkbox" aria-label="Marcar compra" />
      <div class="shopping-name item-rich-text" data-rich-editor data-rich-kind="shopping" data-item-id="${item.id}" contenteditable="true" spellcheck="true" role="textbox" aria-label="Item da compra" data-placeholder="Item da compra"></div>
      <input class="shopping-qty" type="number" min="0" step="0.01" aria-label="Quantidade" />
      <label class="shopping-price-wrap">
        <span class="shopping-currency-symbol">${escapeHtml(getCurrencySymbol(note.currency || "BRL"))}</span>
        <input class="shopping-price" type="number" min="0" step="0.01" aria-label="Valor" placeholder="0,00" />
      </label>
      <button class="icon-button shopping-image-button" type="button" aria-label="Adicionar imagem à compra">
        <svg><use href="#icon-image"></use></svg>
      </button>
      <button class="icon-button danger" type="button" aria-label="Remover compra">
        <svg><use href="#icon-x"></use></svg>
      </button>
      <div class="topic-image-card shopping-item-image" hidden>
        <img alt="" />
        <button class="icon-button danger small" type="button" aria-label="Remover imagem da compra">
          <svg><use href="#icon-x"></use></svg>
        </button>
      </div>
    `;

    const dragHandle = row.querySelector(".item-drag-handle");
    const checkbox = row.querySelector('input[type="checkbox"]');
    const textEditor = row.querySelector("[data-rich-editor]");
    const qtyInput = row.querySelector(".shopping-qty");
    const priceInput = row.querySelector(".shopping-price");
    const imageButton = row.querySelector(".shopping-image-button");
    const removeButton = row.querySelector('button[aria-label="Remover compra"]');
    const imageWrap = row.querySelector(".shopping-item-image");
    const itemImage = imageWrap.querySelector("img");
    const removeImageButton = imageWrap.querySelector("button");

    checkbox.checked = item.done;
    checkbox.disabled = note.trashed;
    textEditor.innerHTML = getRichItemHtml(item);
    textEditor.contentEditable = String(!note.trashed && !note.finalized);
    qtyInput.value = formatInputNumber(item.quantity);
    qtyInput.disabled = note.trashed;
    qtyInput.readOnly = note.finalized;
    priceInput.value = formatInputNumber(item.price);
    priceInput.disabled = note.trashed;
    priceInput.readOnly = note.finalized;
    imageButton.disabled = note.trashed || note.finalized;
    imageButton.hidden = note.finalized;
    removeButton.disabled = note.trashed || note.finalized;
    removeButton.hidden = note.finalized;
    removeImageButton.disabled = note.trashed || note.finalized;
    removeImageButton.hidden = note.finalized;
    dragHandle.hidden = note.trashed || note.finalized;
    dragHandle.draggable = canEditNoteContent(note);
    attachListItemDragHandlers(row, dragHandle, "shopping", item.id);

    if (item.image?.dataUrl) {
      imageWrap.hidden = false;
      itemImage.src = item.image.dataUrl;
    }

    checkbox.addEventListener("change", () => {
      updateShoppingItem(item.id, { done: checkbox.checked });
    });

    bindRichTextEditor(textEditor);

    qtyInput.addEventListener("input", () => {
      updateShoppingItem(item.id, { quantity: normalizeNumber(qtyInput.value, 0) }, { renderEditor: false });
    });

    priceInput.addEventListener("input", () => {
      updateShoppingItem(item.id, { price: normalizeNumber(priceInput.value, 0) }, { renderEditor: false });
    });

    imageButton.addEventListener("click", () => openShoppingImagePicker(item.id));
    imageWrap.addEventListener("click", () => openShoppingImagePicker(item.id));
    removeImageButton.addEventListener("click", (event) => {
      event.stopPropagation();
      updateShoppingItem(item.id, { image: null });
    });

    removeButton.addEventListener("click", () => {
      removeShoppingItem(item.id);
    });

    elements.shoppingItems.append(row);
  });
}

function canUseDrawingTools(note) {
  return Boolean(note && !note.trashed && !note.finalized && note.type !== "goal");
}

function openPageDrawingTool(event) {
  const note = getSelectedNote();
  if (!canUseDrawingTools(note)) {
    showToast(note?.type === "goal" ? "Desenho não disponível para metas" : "Ative a edição para desenhar");
    return;
  }
  drawingTool.context = "page";
  drawingTool.blockId = "";
  activeDrawingBlockId = "";
  openDrawingTool(event?.currentTarget || elements.drawButton, { title: "Caneta e marca-texto", kicker: "Página", showModes: true });
  scheduleEditorCanvasRender();
}

function createDrawingBlock(event) {
  const note = getSelectedNote();
  if (!canUseDrawingTools(note)) {
    showToast(note?.type === "goal" ? "Bloco de desenho não disponível para metas" : "Ative a edição para criar um bloco");
    return;
  }

  const block = { id: cryptoId(), strokes: [], createdAt: Date.now(), updatedAt: Date.now() };
  updateSelectedNote((currentNote) => {
    if (!Array.isArray(currentNote.drawingBlocks)) currentNote.drawingBlocks = [];
    currentNote.drawingBlocks.push(block);
  });
  drawingTool.context = "block";
  drawingTool.blockId = block.id;
  activeDrawingBlockId = block.id;
  openDrawingTool(event?.currentTarget || elements.drawingBlockButton, { title: "Bloco de desenho", kicker: "Banner", showModes: false });
  showToast("Bloco de desenho criado");
}

function openDrawingTool(anchor, options = {}) {
  renderDrawingToolControls(options.showModes !== false);
  elements.drawToolKicker.textContent = options.kicker || "Desenho";
  elements.drawToolTitle.textContent = options.title || "Ferramentas de desenho";
  elements.drawToolPopover.hidden = false;
  applyDrawToolMinimizedState();
  positionDrawingTool(anchor || elements.topToolbar);
  renderEditor();
}

function closeDrawingTool() {
  if (!elements.drawToolPopover) return;
  elements.drawToolPopover.hidden = true;
  drawToolDragState = null;
  activeDrawingPointer = null;
  activeDrawingStroke = null;
  activeDrawingBlockId = "";
  elements.drawButton?.classList.remove("active");
  elements.drawingBlockButton?.classList.remove("active");
  scheduleEditorCanvasRender();
}

function positionDrawingTool(anchor) {
  if (!anchor || !elements.drawToolPopover) return;
  const popover = elements.drawToolPopover;
  popover.style.left = "0px";
  popover.style.top = "0px";
  const bounds = popover.getBoundingClientRect();

  if (drawToolPosition.placed) {
    setDrawToolPosition(drawToolPosition.x, drawToolPosition.y, true);
    return;
  }

  const rect = anchor.getBoundingClientRect();
  setDrawToolPosition(rect.left, rect.bottom + 10, false, bounds);
}

function setDrawToolPosition(x, y, placed = true, knownBounds = null) {
  if (!elements.drawToolPopover) return;
  const bounds = knownBounds || elements.drawToolPopover.getBoundingClientRect();
  const maxX = Math.max(12, window.innerWidth - bounds.width - 12);
  const maxY = Math.max(12, window.innerHeight - bounds.height - 12);
  const nextX = Math.min(Math.max(12, x), maxX);
  const nextY = Math.min(Math.max(12, y), maxY);
  drawToolPosition = { x: nextX, y: nextY, placed };
  elements.drawToolPopover.style.left = nextX + "px";
  elements.drawToolPopover.style.top = nextY + "px";
}

function toggleDrawToolMinimized() {
  drawToolMinimized = !drawToolMinimized;
  applyDrawToolMinimizedState();
  setDrawToolPosition(drawToolPosition.x, drawToolPosition.y, drawToolPosition.placed);
}

function applyDrawToolMinimizedState() {
  if (!elements.drawToolCard) return;
  elements.drawToolCard.classList.toggle("minimized", drawToolMinimized);
  elements.drawToolBody.hidden = drawToolMinimized;
  elements.minimizeDrawToolButton.setAttribute("aria-label", drawToolMinimized ? "Restaurar ferramentas" : "Minimizar ferramentas");
  elements.minimizeDrawToolButton.title = drawToolMinimized ? "Restaurar" : "Minimizar";
  if (elements.minimizeDrawToolIcon) elements.minimizeDrawToolIcon.setAttribute("href", drawToolMinimized ? "#icon-chevron-down" : "#icon-minus");
}

function startDrawToolDrag(event) {
  if (event.target.closest("button, input, select, textarea, [data-draw-mode]")) return;
  if (elements.drawToolPopover.hidden) return;
  const rect = elements.drawToolPopover.getBoundingClientRect();
  drawToolDragState = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    originX: rect.left,
    originY: rect.top,
  };
  elements.drawToolHead.setPointerCapture?.(event.pointerId);
  elements.drawToolCard.classList.add("dragging");
  event.preventDefault();
}

function moveDrawToolDrag(event) {
  if (!drawToolDragState || drawToolDragState.pointerId !== event.pointerId) return;
  const dx = event.clientX - drawToolDragState.startX;
  const dy = event.clientY - drawToolDragState.startY;
  setDrawToolPosition(drawToolDragState.originX + dx, drawToolDragState.originY + dy, true);
  event.preventDefault();
}

function endDrawToolDrag(event) {
  if (!drawToolDragState || drawToolDragState.pointerId !== event.pointerId) return;
  elements.drawToolCard.classList.remove("dragging");
  drawToolDragState = null;
}

function renderDrawingToolControls(showModes) {
  elements.drawModeRow.hidden = !showModes;
  if (!showModes) drawingTool.mode = "pen";
  elements.drawModeRow.querySelectorAll("[data-draw-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.drawMode === drawingTool.mode);
  });
  elements.drawWidthInput.value = String(drawingTool.width);
  elements.drawWidthLabel.textContent = drawingTool.width + " px";
  renderColorButtons(elements.drawColorOptions, ACCENT_COLORS, drawingTool.color, (color) => {
    drawingTool.color = color;
    renderDrawingToolControls(!elements.drawModeRow.hidden);
  });
  elements.clearDrawingButton.textContent = drawingTool.context === "block" ? "Limpar bloco" : "Limpar página";
  updateDrawingHistoryButtons();
}

function handleDrawModeClick(event) {
  const button = event.target.closest("[data-draw-mode]");
  if (!button) return;
  drawingTool.mode = button.dataset.drawMode === "highlight" ? "highlight" : "pen";
  renderDrawingToolControls(true);
}

function handleDrawColorClick(event) {
  const button = event.target.closest("[data-color]");
  if (!button) return;
  drawingTool.color = normalizeAccent(button.dataset.color);
  renderDrawingToolControls(!elements.drawModeRow.hidden);
}

function handleDrawWidthInput() {
  drawingTool.width = Math.max(2, Math.min(34, Number(elements.drawWidthInput.value) || DEFAULT_DRAWING_TOOL.width));
  elements.drawWidthLabel.textContent = drawingTool.width + " px";
}

function clearActiveDrawing() {
  const note = getSelectedNote();
  if (!canUseDrawingTools(note)) return;
  if (drawingTool.context === "block") {
    const block = getDrawingBlock(note, drawingTool.blockId || activeDrawingBlockId);
    if (!block) return;
    block.strokes = [];
    clearDrawingRedoStack("block", block.id);
    block.updatedAt = Date.now();
  } else {
    note.pageDrawings = [];
    clearDrawingRedoStack("page", note.id);
  }
  note.updatedAt = Date.now();
  saveState();
  renderEditor();
  updateDrawingHistoryButtons();
  showToast("Desenho limpo");
}

function undoDrawingStroke() {
  const note = getSelectedNote();
  const target = getActiveDrawingTarget(note);
  if (!target || target.strokes.length === 0) return;

  const stroke = target.strokes.pop();
  getDrawingRedoStack(target.key).push(stroke);
  persistDrawingTarget(note, target);
  renderActiveDrawingTarget(target);
  updateDrawingHistoryButtons();
  showToast("Traço desfeito");
}

function redoDrawingStroke() {
  const note = getSelectedNote();
  const target = getActiveDrawingTarget(note);
  if (!target) return;
  const redoStack = getDrawingRedoStack(target.key);
  if (redoStack.length === 0) return;

  const stroke = redoStack.pop();
  target.strokes.push(stroke);
  persistDrawingTarget(note, target);
  renderActiveDrawingTarget(target);
  updateDrawingHistoryButtons();
  showToast("Traço refeito");
}

function getActiveDrawingTarget(note = getSelectedNote()) {
  if (!canUseDrawingTools(note)) return null;
  if (drawingTool.context === "block") {
    const block = getDrawingBlock(note, drawingTool.blockId || activeDrawingBlockId);
    if (!block) return null;
    if (!Array.isArray(block.strokes)) block.strokes = [];
    return { type: "block", id: block.id, key: getDrawingHistoryKey("block", block.id), strokes: block.strokes, block };
  }
  if (!Array.isArray(note.pageDrawings)) note.pageDrawings = [];
  return { type: "page", id: note.id, key: getDrawingHistoryKey("page", note.id), strokes: note.pageDrawings };
}

function persistDrawingTarget(note, target) {
  if (!note || !target) return;
  if (target.type === "block" && target.block) {
    target.block.strokes = normalizeDrawingStrokes(target.strokes);
    target.block.updatedAt = Date.now();
  } else {
    note.pageDrawings = normalizeDrawingStrokes(target.strokes);
  }
  note.updatedAt = Date.now();
  saveState();
  renderNotes();
  if (elements.updatedLabel) elements.updatedLabel.textContent = `Editado ${formatRelativeTime(note.updatedAt)}`;
}

function renderActiveDrawingTarget(target) {
  if (!target) return;
  if (target.type === "page") {
    renderDrawingCanvas(elements.editorDrawingCanvas, target.strokes);
    scheduleEditorCanvasRender();
    return;
  }
  const canvas = document.querySelector(`.drawing-block-card[data-block-id="${target.id}"] .drawing-block-canvas`);
  if (canvas) renderDrawingCanvas(canvas, target.strokes);
}

function getDrawingHistoryKey(type, id) {
  return `${type}:${id || ""}`;
}

function getDrawingRedoStack(key) {
  if (!drawingRedoStacks.has(key)) drawingRedoStacks.set(key, []);
  return drawingRedoStacks.get(key);
}

function clearDrawingRedoStack(type, id) {
  drawingRedoStacks.delete(getDrawingHistoryKey(type, id));
}

function updateDrawingHistoryButtons() {
  if (!elements.undoDrawingButton || !elements.redoDrawingButton) return;
  const target = getActiveDrawingTarget();
  const redoStack = target ? getDrawingRedoStack(target.key) : [];
  elements.undoDrawingButton.disabled = !target || target.strokes.length === 0;
  elements.redoDrawingButton.disabled = !target || redoStack.length === 0;
}

function renderDrawingBlocks(note) {
  elements.drawingBlocksPanel.replaceChildren();
  const visible = note.type !== "goal" && Array.isArray(note.drawingBlocks) && note.drawingBlocks.length > 0;
  elements.drawingBlocksPanel.hidden = !visible;
  if (!visible) return;

  note.drawingBlocks.forEach((block, index) => {
    const article = document.createElement("article");
    article.className = "drawing-block-card";
    article.dataset.blockId = block.id;
    article.innerHTML = `
      <div class="drawing-block-head">
        <button class="block-drag-handle drawing-drag-handle" type="button" draggable="true" aria-label="Mover bloco de desenho"><svg><use href="#icon-grip"></use></svg></button>
        <span>Bloco de desenho ${index + 1}</span>
        <div>
          <button class="icon-button small" type="button" data-drawing-edit aria-label="Editar bloco"><svg><use href="#icon-pen"></use></svg></button>
          <button class="icon-button danger small" type="button" data-drawing-remove aria-label="Remover bloco"><svg><use href="#icon-x"></use></svg></button>
        </div>
      </div>
      <canvas class="drawing-block-canvas" aria-label="Área de desenho"></canvas>
    `;
    const canvas = article.querySelector("canvas");
    const dragHandle = article.querySelector(".drawing-drag-handle");
    const editButton = article.querySelector("[data-drawing-edit]");
    const removeButton = article.querySelector("[data-drawing-remove]");
    editButton.disabled = !canUseDrawingTools(note);
    removeButton.disabled = !canUseDrawingTools(note);
    removeButton.hidden = note.finalized;
    dragHandle.hidden = !canUseDrawingTools(note);
    dragHandle.draggable = canUseDrawingTools(note);
    attachDrawingBlockDragHandlers(article, dragHandle, block.id);
    editButton.addEventListener("click", (event) => {
      if (!canUseDrawingTools(note)) return;
      drawingTool.context = "block";
      drawingTool.blockId = block.id;
      activeDrawingBlockId = block.id;
      openDrawingTool(event.currentTarget, { title: "Bloco de desenho", kicker: "Banner", showModes: false });
    });
    removeButton.addEventListener("click", () => removeDrawingBlock(block.id));
    bindDrawingBlockCanvas(canvas, block.id);
    elements.drawingBlocksPanel.append(article);
    requestAnimationFrame(() => renderDrawingCanvas(canvas, block.strokes || []));
  });
}

function bindDrawingBlockCanvas(canvas, blockId) {
  canvas.addEventListener("pointerdown", (event) => startBlockDrawing(event, canvas, blockId));
  canvas.addEventListener("pointermove", (event) => moveBlockDrawing(event, canvas));
  canvas.addEventListener("pointerup", (event) => endBlockDrawing(event, canvas));
  canvas.addEventListener("pointercancel", (event) => endBlockDrawing(event, canvas));
}

function startEditorDrawing(event) {
  const note = getSelectedNote();
  if (!canUseDrawingTools(note) || drawingTool.context !== "page" || elements.drawToolPopover.hidden) return;
  const point = getCanvasPoint(event, elements.editorDrawingCanvas);
  activeDrawingPointer = event.pointerId;
  activeDrawingStroke = createDrawingStroke(point);
  elements.editorDrawingCanvas.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function moveEditorDrawing(event) {
  const note = getSelectedNote();
  if (!note || activeDrawingPointer !== event.pointerId || !activeDrawingStroke || drawingTool.context !== "page") return;
  activeDrawingStroke.points.push(getCanvasPoint(event, elements.editorDrawingCanvas));
  renderDrawingCanvas(elements.editorDrawingCanvas, [...(note.pageDrawings || []), activeDrawingStroke]);
  event.preventDefault();
}

function endEditorDrawing(event) {
  const note = getSelectedNote();
  if (!note || activeDrawingPointer !== event.pointerId || !activeDrawingStroke || drawingTool.context !== "page") return;
  activeDrawingStroke.points.push(getCanvasPoint(event, elements.editorDrawingCanvas));
  note.pageDrawings = normalizeDrawingStrokes([...(note.pageDrawings || []), activeDrawingStroke]);
  clearDrawingRedoStack("page", note.id);
  note.updatedAt = Date.now();
  saveState();
  renderNotes();
  elements.updatedLabel.textContent = `Editado ${formatRelativeTime(note.updatedAt)}`;
  activeDrawingPointer = null;
  activeDrawingStroke = null;
  renderDrawingCanvas(elements.editorDrawingCanvas, note.pageDrawings);
  updateDrawingHistoryButtons();
  event.preventDefault();
}

function startBlockDrawing(event, canvas, blockId) {
  const note = getSelectedNote();
  if (!canUseDrawingTools(note)) return;
  drawingTool.context = "block";
  drawingTool.blockId = blockId;
  activeDrawingBlockId = blockId;
  if (elements.drawToolPopover.hidden) openDrawingTool(canvas.closest(".drawing-block-card"), { title: "Bloco de desenho", kicker: "Banner", showModes: false });
  const point = getCanvasPoint(event, canvas);
  activeDrawingPointer = event.pointerId;
  activeDrawingStroke = createDrawingStroke(point, "pen");
  canvas.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function moveBlockDrawing(event, canvas) {
  const note = getSelectedNote();
  if (!note || activeDrawingPointer !== event.pointerId || !activeDrawingStroke || drawingTool.context !== "block") return;
  const block = getDrawingBlock(note, drawingTool.blockId || activeDrawingBlockId);
  if (!block) return;
  activeDrawingStroke.points.push(getCanvasPoint(event, canvas));
  renderDrawingCanvas(canvas, [...(block.strokes || []), activeDrawingStroke]);
  event.preventDefault();
}

function endBlockDrawing(event, canvas) {
  const note = getSelectedNote();
  if (!note || activeDrawingPointer !== event.pointerId || !activeDrawingStroke || drawingTool.context !== "block") return;
  const block = getDrawingBlock(note, drawingTool.blockId || activeDrawingBlockId);
  if (!block) return;
  activeDrawingStroke.points.push(getCanvasPoint(event, canvas));
  block.strokes = normalizeDrawingStrokes([...(block.strokes || []), activeDrawingStroke]);
  clearDrawingRedoStack("block", block.id);
  block.updatedAt = Date.now();
  note.updatedAt = Date.now();
  saveState();
  renderNotes();
  elements.updatedLabel.textContent = `Editado ${formatRelativeTime(note.updatedAt)}`;
  activeDrawingPointer = null;
  activeDrawingStroke = null;
  renderDrawingCanvas(canvas, block.strokes);
  updateDrawingHistoryButtons();
  event.preventDefault();
}

function createDrawingStroke(point, forcedMode = "") {
  return {
    id: cryptoId(),
    mode: forcedMode || drawingTool.mode,
    color: normalizeAccent(drawingTool.color),
    width: Math.max(2, Math.min(34, Number(drawingTool.width) || DEFAULT_DRAWING_TOOL.width)),
    points: [point],
  };
}

function getCanvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  const x = rect.width ? (event.clientX - rect.left) / rect.width : 0;
  const y = rect.height ? (event.clientY - rect.top) / rect.height : 0;
  return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
}

function renderDrawingCanvas(canvas, strokes) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  normalizeDrawingStrokes(strokes).forEach((stroke) => drawStroke(ctx, stroke, width, height, ratio));
}

function drawStroke(ctx, stroke, width, height, ratio) {
  const points = Array.isArray(stroke.points) ? stroke.points : [];
  if (!points.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = normalizeAccent(stroke.color);
  ctx.lineWidth = Math.max(1, Number(stroke.width) || 6) * ratio;
  ctx.globalAlpha = stroke.mode === "highlight" ? 0.32 : 0.96;
  ctx.globalCompositeOperation = stroke.mode === "highlight" ? "multiply" : "source-over";
  ctx.beginPath();
  ctx.moveTo(points[0].x * width, points[0].y * height);
  points.slice(1).forEach((point) => ctx.lineTo(point.x * width, point.y * height));
  if (points.length === 1) ctx.lineTo(points[0].x * width + 0.01, points[0].y * height + 0.01);
  ctx.stroke();
  ctx.restore();
}

function scheduleEditorCanvasRender() {
  cancelAnimationFrame(editorCanvasRaf);
  editorCanvasRaf = requestAnimationFrame(renderEditorDrawingLayer);
}

function renderEditorDrawingLayer() {
  const note = getSelectedNote();
  const available = canUseDrawingTools(note) && drawingTool.context === "page" && !elements.drawToolPopover.hidden;
  const hasStoredDrawing = note && note.type !== "goal" && Array.isArray(note.pageDrawings) && note.pageDrawings.length > 0;
  elements.editorDrawingLayer.hidden = !(available || hasStoredDrawing);
  elements.editorDrawingLayer.classList.toggle("active", available);
  if (!note || note.type === "goal") return;
  renderDrawingCanvas(elements.editorDrawingCanvas, note.pageDrawings || []);
}

function removeDrawingBlock(blockId) {
  const note = getSelectedNote();
  if (!canUseDrawingTools(note)) return;
  updateSelectedNote((currentNote) => {
    currentNote.drawingBlocks = (currentNote.drawingBlocks || []).filter((block) => block.id !== blockId);
  });
  if (activeDrawingBlockId === blockId || drawingTool.blockId === blockId) closeDrawingTool();
  showToast("Bloco removido");
}

function getDrawingBlock(note, blockId) {
  return (note?.drawingBlocks || []).find((block) => block.id === blockId) || null;
}

function normalizeDrawingStrokes(strokes) {
  if (!Array.isArray(strokes)) return [];
  return strokes.map((stroke) => ({
    id: stroke?.id || cryptoId(),
    mode: stroke?.mode === "highlight" ? "highlight" : "pen",
    color: normalizeAccent(stroke?.color || DEFAULT_DRAWING_TOOL.color),
    width: Math.max(2, Math.min(34, Number(stroke?.width) || DEFAULT_DRAWING_TOOL.width)),
    points: Array.isArray(stroke?.points) ? stroke.points.map((point) => ({
      x: Math.max(0, Math.min(1, Number(point?.x) || 0)),
      y: Math.max(0, Math.min(1, Number(point?.y) || 0)),
    })).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) : [],
  })).filter((stroke) => stroke.points.length > 0);
}

function normalizeDrawingBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((block) => ({
    id: block?.id || cryptoId(),
    strokes: normalizeDrawingStrokes(block?.strokes),
    createdAt: Number.isFinite(block?.createdAt) ? block.createdAt : Date.now(),
    updatedAt: Number.isFinite(block?.updatedAt) ? block.updatedAt : Date.now(),
  }));
}

function attachNoteBlockDragHandle(handle, blockIds) {
  if (!handle) return;
  handle.addEventListener("dragstart", (event) => {
    if (!canEditNoteContent(getSelectedNote())) {
      event.preventDefault();
      return;
    }
    draggedNoteBlockIds = blockIds.slice();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockIds.join(","));
    handle.closest(".note-content-block")?.classList.add("dragging");
  });
  handle.addEventListener("dragend", () => {
    draggedNoteBlockIds = [];
    $$(".note-content-block.dragging, .note-content-block.drag-over").forEach((item) => item.classList.remove("dragging", "drag-over"));
  });
}

function attachNoteBlockDropHandlers(element, targetBlockIds) {
  element.addEventListener("dragover", (event) => {
    if (!draggedNoteBlockIds.length || draggedNoteBlockIds.some((id) => targetBlockIds.includes(id))) return;
    event.preventDefault();
    element.classList.add("drag-over");
    event.dataTransfer.dropEffect = "move";
  });
  element.addEventListener("dragleave", () => element.classList.remove("drag-over"));
  element.addEventListener("drop", (event) => {
    if (!draggedNoteBlockIds.length) return;
    event.preventDefault();
    element.classList.remove("drag-over");
    reorderNoteBlocks(draggedNoteBlockIds, targetBlockIds);
  });
}

function reorderNoteBlocks(sourceIds, targetIds) {
  const note = getSelectedNote();
  if (!canEditNoteContent(note) || note.type !== "note") return;
  if (!sourceIds.length || sourceIds.some((id) => targetIds.includes(id))) return;
  const sourceSet = new Set(sourceIds);
  const moving = note.blocks.filter((block) => sourceSet.has(block.id));
  if (!moving.length) return;
  const remaining = note.blocks.filter((block) => !sourceSet.has(block.id));
  let targetIndex = remaining.findIndex((block) => targetIds.includes(block.id));
  if (targetIndex < 0) targetIndex = remaining.length;
  remaining.splice(targetIndex, 0, ...moving);
  note.blocks = remaining;
  ensureNoteTextBlock(note);
  note.content = getTextFromBlocks(note);
  note.updatedAt = Date.now();
  draggedNoteBlockIds = [];
  saveState();
  renderEditor();
  renderNotes();
  showToast("Blocos reorganizados");
}

function attachListItemDragHandlers(row, handle, type, itemId) {
  if (!handle) return;
  handle.addEventListener("dragstart", (event) => {
    if (!canEditNoteContent(getSelectedNote())) {
      event.preventDefault();
      return;
    }
    if (type === "checklist") draggedChecklistItemId = itemId;
    if (type === "shopping") draggedShoppingItemId = itemId;
    row.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", itemId);
  });
  handle.addEventListener("dragend", () => {
    draggedChecklistItemId = "";
    draggedShoppingItemId = "";
    $$(".check-item.dragging, .check-item.drag-over, .shopping-item.dragging, .shopping-item.drag-over").forEach((item) => item.classList.remove("dragging", "drag-over"));
  });
  row.addEventListener("dragover", (event) => {
    const activeId = type === "checklist" ? draggedChecklistItemId : draggedShoppingItemId;
    if (!activeId || activeId === itemId) return;
    event.preventDefault();
    row.classList.add("drag-over");
    event.dataTransfer.dropEffect = "move";
  });
  row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
  row.addEventListener("drop", (event) => {
    const activeId = type === "checklist" ? draggedChecklistItemId : draggedShoppingItemId;
    if (!activeId) return;
    event.preventDefault();
    row.classList.remove("drag-over");
    if (type === "checklist") reorderChecklistItem(itemId);
    if (type === "shopping") reorderShoppingItem(itemId);
  });
}

function reorderChecklistItem(targetItemId) {
  const note = getSelectedNote();
  if (!canEditNoteContent(note) || !draggedChecklistItemId || draggedChecklistItemId === targetItemId) return;
  reorderArrayItem(note.items, draggedChecklistItemId, targetItemId);
  draggedChecklistItemId = "";
  note.updatedAt = Date.now();
  saveState();
  renderEditor();
  renderNotes();
  showToast("Checklist reorganizado");
}

function reorderShoppingItem(targetItemId) {
  const note = getSelectedNote();
  if (!canEditNoteContent(note) || !draggedShoppingItemId || draggedShoppingItemId === targetItemId) return;
  reorderArrayItem(note.shoppingItems, draggedShoppingItemId, targetItemId);
  draggedShoppingItemId = "";
  note.updatedAt = Date.now();
  saveState();
  renderEditor();
  renderNotes();
  showToast("Compras reorganizadas");
}

function attachDrawingBlockDragHandlers(card, handle, blockId) {
  if (!handle) return;
  handle.addEventListener("dragstart", (event) => {
    if (!canUseDrawingTools(getSelectedNote())) {
      event.preventDefault();
      return;
    }
    draggedDrawingBlockId = blockId;
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", blockId);
  });
  handle.addEventListener("dragend", () => {
    draggedDrawingBlockId = "";
    $$(".drawing-block-card.dragging, .drawing-block-card.drag-over").forEach((item) => item.classList.remove("dragging", "drag-over"));
  });
  card.addEventListener("dragover", (event) => {
    if (!draggedDrawingBlockId || draggedDrawingBlockId === blockId) return;
    event.preventDefault();
    card.classList.add("drag-over");
    event.dataTransfer.dropEffect = "move";
  });
  card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
  card.addEventListener("drop", (event) => {
    if (!draggedDrawingBlockId) return;
    event.preventDefault();
    card.classList.remove("drag-over");
    reorderDrawingBlock(blockId);
  });
}

function reorderDrawingBlock(targetBlockId) {
  const note = getSelectedNote();
  if (!canUseDrawingTools(note) || !draggedDrawingBlockId || draggedDrawingBlockId === targetBlockId) return;
  reorderArrayItem(note.drawingBlocks, draggedDrawingBlockId, targetBlockId);
  draggedDrawingBlockId = "";
  note.updatedAt = Date.now();
  saveState();
  renderEditor();
  showToast("Blocos de desenho reorganizados");
}

function reorderArrayItem(items, sourceId, targetId) {
  const sourceIndex = items.findIndex((item) => item.id === sourceId);
  if (sourceIndex < 0 || sourceId === targetId) return;
  const [moving] = items.splice(sourceIndex, 1);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) {
    items.push(moving);
    return;
  }
  items.splice(targetIndex, 0, moving);
}

function applyCustomCursor() {
  document.body.classList.toggle("custom-cursor", preferences.customCursor !== false);
}

function toggleCustomCursor() {
  preferences.customCursor = elements.cursorToggleInput.checked;
  savePreferences();
  applyCustomCursor();
  showToast(preferences.customCursor ? "Cursor UI ativado" : "Cursor UI desativado");
}
function renderGoal(note) {
  if (!elements.goalEditor || note.type !== "goal") return;
  const goal = ensureGoal(note);
  const locked = note.trashed || note.finalized;

  elements.goalForm.hidden = note.finalized;
  elements.goalSummary.hidden = !note.finalized;

  if (note.finalized) {
    renderGoalSummary(note);
    return;
  }

  elements.goalNameInput.value = goal.name;
  elements.goalTargetInput.value = formatInputNumber(goal.target);
  elements.goalSavedInput.value = formatInputNumber(goal.saved);
  elements.goalCategoryInput.value = goal.category === "Sem categoria" ? "" : goal.category;
  elements.goalStartDateInput.value = goal.startDate;
  elements.goalHasDeadlineInput.checked = goal.hasTargetDate;
  elements.goalTargetDateWrap.hidden = !goal.hasTargetDate;
  elements.goalTargetDateInput.value = goal.targetDate;
  if (elements.goalNotifyInput) elements.goalNotifyInput.checked = false;

  [elements.goalNameInput, elements.goalTargetInput, elements.goalSavedInput, elements.goalCategoryInput, elements.goalStartDateInput, elements.goalHasDeadlineInput, elements.goalTargetDateInput].filter(Boolean).forEach((control) => {
    control.disabled = locked || (control === elements.goalTargetDateInput && !goal.hasTargetDate);
  });

  renderColorButtons(elements.goalColorOptions, FOLDER_COLORS, goal.color, (color) => updateGoalData({ color }));
}

function renderGoalSummary(note) {
  const goal = ensureGoal(note);
  const metrics = getGoalMetrics(note);
  const duration = formatDurationParts(metrics.remainingDays);
  const totalValue = getGoalTotalValue(metrics.totalDays, goal.totalMode);
  const recommendation = metrics.hasDeadline ? formatCurrency(metrics.recommendation, "BRL") : "Defina uma data final";
  const progress = Math.min(metrics.percent, 100);
  const savedLineBottom = 30 + progress * 1.6;
  const chart = getGoalChartBars(note);
  const chartBars = chart.bars.map((bar) =>
    '<div class="goal-chart-bar" title="' + escapeHtml(bar.title) + '">' +
      '<i style="height:' + bar.height + '%"></i>' +
      '<span>' + escapeHtml(bar.label) + '</span>' +
    '</div>'
  ).join("");

  elements.goalSummary.innerHTML =
    '<div class="goal-dashboard" style="--goal-color:' + goal.color + '; --goal-progress:' + progress + '%; --goal-saved-bottom:' + savedLineBottom + 'px;">' +
      '<article class="goal-card goal-overview-card">' +
        '<div class="goal-card-kicker"><span class="goal-card-dot"></span>' + escapeHtml(goal.category || "Sem categoria") + '</div>' +
        '<div class="goal-overview-head">' +
          '<div>' +
            '<span>Meta</span>' +
            '<h2>' + escapeHtml(goal.name || "Meta sem nome") + '</h2>' +
          '</div>' +
          '<div class="goal-progress-ring">' +
            '<strong>' + formatPercent(metrics.percent) + '</strong>' +
            '<span>Progresso</span>' +
          '</div>' +
        '</div>' +
        '<div class="goal-overview-grid">' +
          '<div><span>Objetivo</span><strong>' + formatCurrency(goal.target, "BRL") + '</strong></div>' +
          '<div><span>Faltam</span><strong class="goal-missing">' + formatCurrency(metrics.remaining, "BRL") + '</strong></div>' +
        '</div>' +
      '</article>' +
      '<article class="goal-card goal-accumulated-card">' +
        '<span>Dinheiro acumulado</span>' +
        '<strong>' + formatCurrency(goal.saved, "BRL") + '</strong>' +
        '<p>' + formatPercent(metrics.percent) + ' do objetivo guardado</p>' +
        '<div class="goal-money-actions">' +
          '<button class="danger filled" type="button" data-goal-action="withdraw">Retirar dinheiro</button>' +
          '<button class="secondary filled" type="button" data-goal-action="edit">Editar objetivo</button>' +
          '<button class="primary filled" type="button" data-goal-action="add">Adicionar dinheiro</button>' +
        '</div>' +
      '</article>' +
      '<article class="goal-card goal-chart-card">' +
        '<div class="goal-card-heading"><span>Gr\u00e1fico</span><strong>' + escapeHtml(chart.title) + '</strong></div>' +
        '<div class="goal-chart">' +
          '<span class="goal-chart-saved-line"><em>Atual</em></span>' +
          '<div class="goal-chart-bars">' + chartBars + '</div>' +
        '</div>' +
        '<div class="goal-chart-legend"><span><i></i>Proje\u00e7\u00e3o</span><span><i class="actual"></i>Salvo hoje</span></div>' +
      '</article>' +
      '<article class="goal-card goal-recommendations">' +
        '<div class="goal-card-heading"><span>Recomenda\u00e7\u00f5es</span><strong>Para atingir a meta</strong></div>' +
        '<div class="goal-mode-row">' +
          renderGoalModeButton("day", "Por dia", goal.recommendationMode) +
          renderGoalModeButton("week", "Por semana", goal.recommendationMode) +
          renderGoalModeButton("month", "a cada 30 dias", goal.recommendationMode) +
        '</div>' +
        '<strong>' + recommendation + '</strong>' +
        '<p>Aproximadamente, considerando o valor que falta e a data final.</p>' +
      '</article>' +
      '<article class="goal-card goal-time-card">' +
        '<div class="goal-card-heading"><span>Tempo</span><strong>Prazo da meta</strong></div>' +
        '<div class="goal-time-left"><span>Tempo at\u00e9 o fim do objetivo</span><div>' +
          '<strong>' + duration.months + '</strong><small>' + (duration.months === 1 ? "M\u00eas" : "Meses") + '</small>' +
          '<strong>' + duration.weeks + '</strong><small>' + (duration.weeks === 1 ? "Semana" : "Semanas") + '</small>' +
          '<strong>' + duration.days + '</strong><small>' + (duration.days === 1 ? "Dia" : "Dias") + '</small>' +
        '</div></div>' +
        '<div class="goal-total-time">' +
          '<span>Tempo total do objetivo em</span>' +
          '<div class="goal-mode-row">' +
            renderGoalTotalModeButton("months", "Meses", goal.totalMode) +
            renderGoalTotalModeButton("weeks", "Semanas", goal.totalMode) +
            renderGoalTotalModeButton("days", "Dias", goal.totalMode) +
          '</div>' +
          '<strong>' + totalValue + '</strong>' +
        '</div>' +
      '</article>' +
    '</div>';
}

function updateShoppingTotal(note) {
  elements.shoppingTotalText.textContent = formatCurrency(getShoppingTotal(note), note.currency || "BRL");
}

function getVisibleNotes() {
  const query = elements.searchInput.value.trim().toLowerCase();

  return state.notes
    .filter((note) => {
      if (currentView === "trash") return note.trashed;
      if (note.trashed || note.archived) return false;
      if (currentView === "pinned" && !note.pinned) return false;
      if (currentView.startsWith("folder:") && note.folderId !== currentView.replace("folder:", "")) return false;

      if (!query) return true;

      const folder = getFolder(note.folderId)?.name || "";
      const itemText = note.items.map((item) => item.text).join(" ");
      const shoppingText = note.shoppingItems.map((item) => item.text).join(" ");
      const goalText = note.goal ? `${note.goal.name} ${note.goal.category}` : "";
      const attachmentText = note.attachments.map((attachment) => attachment.name).join(" ");
      return `${note.title} ${note.content} ${itemText} ${shoppingText} ${goalText} ${folder} ${attachmentText}`.toLowerCase().includes(query);
    })
    .sort(sortNotes);
}

function sortNotes(a, b) {
  if (a.pinned !== b.pinned && currentView !== "trash") return Number(b.pinned) - Number(a.pinned);
  if (a.order !== b.order) return a.order - b.order;
  return b.createdAt - a.createdAt;
}

function getSelectedNote() {
  return state.notes.find((note) => note.id === selectedNoteId) || null;
}

function ensureSelection() {
  const visibleNotes = getVisibleNotes();
  if (!visibleNotes.some((note) => note.id === selectedNoteId)) {
    selectedNoteId = visibleNotes[0]?.id ?? null;
  }
}

function createNote(type) {
  const now = Date.now();
  const folderId = currentView.startsWith("folder:") ? currentView.replace("folder:", "") : "";
  const note = {
    id: cryptoId(),
    type,
    title: getNewNoteTitle(type),
    content: "",
    blocks: type === "note" ? [{ id: cryptoId(), type: "text", text: "", html: "" }] : [],
    items: type === "checklist" ? [{ id: cryptoId(), text: "Primeiro item", html: "", done: false, image: null }] : [],
    shoppingItems: type === "shopping" ? [{ id: cryptoId(), text: "Primeiro item", html: "", done: false, quantity: 1, price: 0, image: null }] : [],
    goal: createGoalDefaults(now),
    currency: "BRL",
    attachments: [],
    pageDrawings: [],
    drawingBlocks: [],
    folderId,
    pinned: false,
    trashed: false,
    archived: false,
    finalized: false,
    order: getNextOrder(),
    createdAt: now,
    updatedAt: now,
  };

  state.notes.unshift(note);
  normalizeOrders();
  selectedNoteId = note.id;
  if (currentView === "trash" || currentView === "pinned") {
    currentView = "all";
  }
  saveState();
  closeSidebar();
  render();
  if (isMobileLayout()) showMobileScreen("editor");
  elements.titleInput.focus();
  elements.titleInput.select();
}

function createFolder() {
  const name = prompt("Nome da pasta:");
  if (!name?.trim()) return;

  const folder = {
    id: cryptoId(),
    name: name.trim(),
    color: preferences.defaultFolderColor,
    order: state.folders.length,
  };

  state.folders.push(folder);
  currentView = `folder:${folder.id}`;
  selectedNoteId = getVisibleNotes()[0]?.id ?? null;
  saveState();
  render();
  showToast("Pasta criada");
}

function editFolder(folderId) {
  openFolderDialog(folderId);
}

function updateNoteType(type) {
  const currentNote = getSelectedNote();
  if (!canEditNoteContent(currentNote)) return;

  updateSelectedNote((note) => {
    note.type = type;
    if (type === "note") {
      ensureNoteTextBlock(note);
      note.content = getTextFromBlocks(note);
    }
    if (type === "checklist" && note.items.length === 0) {
      note.items = [{ id: cryptoId(), text: note.content.trim() || "Novo item", html: "", done: false, image: null }];
      note.content = "";
    }
    if (type === "shopping" && note.shoppingItems.length === 0) {
      note.shoppingItems = [{ id: cryptoId(), text: note.content.trim() || "Novo item", html: "", done: false, quantity: 1, price: 0, image: null }];
      note.content = "";
      note.currency = note.currency || "BRL";
    }
    if (type === "goal") {
      note.pageDrawings = [];
      note.drawingBlocks = [];
      closeDrawingTool();
      note.goal = normalizeGoal(note.goal, note);
      if (!note.goal.name && note.title && note.title !== "Nova meta") note.goal.name = note.title;
      note.title = note.goal.name || "Nova meta";
      note.content = "";
    }
  });
}

function togglePin() {
  updateSelectedNote((note) => {
    note.pinned = !note.pinned;
  });
  showToast(getSelectedNote()?.pinned ? "Nota fixada" : "Nota desafixada");
}

function archiveSelectedNote() {
  const note = getSelectedNote();
  if (!note || note.trashed) return;

  note.archived = true;
  note.pinned = false;
  note.updatedAt = Date.now();
  selectedNoteId = getVisibleNotes().find((item) => item.id !== note.id)?.id ?? null;
  saveState();
  render();
  showToast("Nota arquivada");
}

function deleteSelectedNote() {
  const note = getSelectedNote();
  if (!note) return;

  note.trashed = true;
  note.archived = false;
  note.pinned = false;
  note.updatedAt = Date.now();
  selectedNoteId = getVisibleNotes().find((item) => item.id !== note.id)?.id ?? null;
  saveState();
  render();
  showToast("Nota movida para a lixeira");
}

function restoreSelectedNote() {
  const note = getSelectedNote();
  if (!note) return;

  note.trashed = false;
  note.archived = false;
  note.updatedAt = Date.now();
  currentView = "all";
  selectedNoteId = note.id;
  saveState();
  render();
  showToast("Nota restaurada");
}

async function addMediaAttachments() {
  const note = getSelectedNote();
  const files = Array.from(elements.mediaInput.files || []);
  elements.mediaInput.value = "";

  if (!canEditNoteContent(note) || files.length === 0) return;

  const accepted = files.filter((file) => file.size <= MAX_ATTACHMENT_BYTES);
  const rejected = files.length - accepted.length;

  if (rejected > 0) {
    showToast(`Arquivo acima de ${formatFileSize(MAX_ATTACHMENT_BYTES)} ignorado`);
  }

  if (accepted.length === 0) return;

  try {
    const attachments = await Promise.all(
      accepted.map(async (file) => ({
        id: cryptoId(),
        name: file.name,
        type: file.type || "application/octet-stream",
        size: file.size,
        dataUrl: await readFileAsDataUrl(file),
        createdAt: Date.now(),
      }))
    );

    const previousAttachments = note.attachments.slice();
    const previousBlocks = JSON.parse(JSON.stringify(note.blocks || []));
    try {
      updateSelectedNote((currentNote) => {
        currentNote.attachments.push(...attachments);
        if (currentNote.type === "note") {
          const imageAttachments = attachments.filter((attachment) => attachment.type.startsWith("image/"));
          insertImageAttachmentsIntoNote(currentNote, imageAttachments);
        }
      });
    } catch (error) {
      note.attachments = previousAttachments;
      note.blocks = previousBlocks;
      render();
      throw error;
    }
    showToast(attachments.length === 1 ? "Imagem adicionada" : "Imagens adicionadas");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível anexar esse arquivo");
  }
}

async function addChecklistItemImage() {
  const note = getSelectedNote();
  const file = elements.checklistImageInput.files?.[0];
  elements.checklistImageInput.value = "";
  const targetType = shoppingImageTargetId ? "shopping" : checklistImageTargetId ? "checklist" : "";
  const targetId = targetType === "shopping" ? shoppingImageTargetId : checklistImageTargetId;

  if (!canEditNoteContent(note) || !file || !targetId) return;

  if (file.size > MAX_ATTACHMENT_BYTES) {
    showToast(`Imagem acima de ${formatFileSize(MAX_ATTACHMENT_BYTES)} ignorada`);
    checklistImageTargetId = null;
    shoppingImageTargetId = null;
    return;
  }

  try {
    const image = {
      id: cryptoId(),
      name: file.name,
      type: file.type || "image/*",
      size: file.size,
      dataUrl: await readFileAsDataUrl(file),
      createdAt: Date.now(),
    };
    if (targetType === "shopping") updateShoppingItem(targetId, { image });
    else updateChecklistItem(targetId, { image });
    showToast("Imagem adicionada ao tópico");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível adicionar a imagem");
  } finally {
    checklistImageTargetId = null;
    shoppingImageTargetId = null;
  }
}
function removeAttachment(attachmentId) {
  if (!canEditNoteContent(getSelectedNote())) return;

  updateSelectedNote((note) => {
    note.attachments = note.attachments.filter((attachment) => attachment.id !== attachmentId);
  });
  showToast("Anexo removido");
}

function emptyTrash() {
  const trashedCount = state.notes.filter((note) => note.trashed).length;
  if (!trashedCount) return;

  const shouldEmpty = confirm(`Excluir definitivamente ${trashedCount} ${trashedCount === 1 ? "nota" : "notas"}?`);
  if (!shouldEmpty) return;

  state.notes = state.notes.filter((note) => !note.trashed);
  selectedNoteId = getVisibleNotes()[0]?.id ?? null;
  saveState();
  render();
  showToast("Lixeira esvaziada");
}

function toggleFinalizeSelectedNote() {
  const note = getSelectedNote();
  if (!note || note.trashed) return;
  if (!note.finalized && !canFinalizeNote(note)) return;

  note.finalized = !note.finalized;
  note.updatedAt = Date.now();
  saveState();
  render();
  showToast(note.finalized ? "Nota finalizada" : "Modo de edi\u00e7\u00e3o ativado");
}

function canEditNoteContent(note) {
  return Boolean(note && !note.trashed && !note.finalized);
}

function canFinalizeNote(note) {
  if (note.type !== "goal") return true;
  const goal = ensureGoal(note);
  if (!goal.name.trim()) {
    showToast("Preencha o nome da meta");
    return false;
  }
  if (normalizeNumber(goal.target, 0) <= 0) {
    showToast("Informe o valor da meta");
    return false;
  }
  if (goal.hasTargetDate && !goal.targetDate) {
    showToast("Informe a data final da meta");
    return false;
  }
  return true;
}

function isDoneOnlyPatch(patch) {
  const keys = Object.keys(patch || {});
  return keys.length === 1 && keys[0] === "done";
}

function updateSelectedNote(mutator, options = {}) {
  const shouldRenderEditor = options.renderEditor !== false;
  const note = getSelectedNote();
  if (!note) return;

  mutator(note);
  note.updatedAt = Date.now();
  saveState();
  renderSidebar();
  renderNotes();
  elements.updatedLabel.textContent = `Editado ${formatRelativeTime(note.updatedAt)}`;
  if (shouldRenderEditor) {
    renderEditor();
  }
}

function addChecklistItem() {
  if (!canEditNoteContent(getSelectedNote())) return;

  const text = elements.newItemInput.value.trim();
  if (!text) return;

  updateSelectedNote((note) => {
    note.type = "checklist";
    note.items.push({ id: cryptoId(), text, html: "", done: false, image: null });
  });

  elements.newItemInput.value = "";
  elements.newItemInput.focus();
}

function updateChecklistItem(itemId, patch, options = {}) {
  const note = getSelectedNote();
  if (!note || note.trashed || (note.finalized && !isDoneOnlyPatch(patch))) return;

  updateSelectedNote((note) => {
    const item = note.items.find((candidate) => candidate.id === itemId);
    if (!item) return;
    Object.assign(item, patch);
  }, options);
}

function removeChecklistItem(itemId) {
  if (!canEditNoteContent(getSelectedNote())) return;

  updateSelectedNote((note) => {
    note.items = note.items.filter((item) => item.id !== itemId);
  });
}

function openChecklistImagePicker(itemId) {
  if (!canEditNoteContent(getSelectedNote())) return;

  checklistImageTargetId = itemId;
  shoppingImageTargetId = null;
  elements.checklistImageInput.click();
}

function openShoppingImagePicker(itemId) {
  if (!canEditNoteContent(getSelectedNote())) return;

  shoppingImageTargetId = itemId;
  checklistImageTargetId = null;
  elements.checklistImageInput.click();
}

function addShoppingItem() {
  if (!canEditNoteContent(getSelectedNote())) return;

  const text = elements.newShoppingItemInput.value.trim();
  if (!text) return;

  updateSelectedNote((note) => {
    note.type = "shopping";
    note.shoppingItems.push({
      id: cryptoId(),
      text,
      html: "",
      done: false,
      quantity: normalizeNumber(elements.newShoppingQtyInput.value, 1),
      price: normalizeNumber(elements.newShoppingPriceInput.value, 0),
      image: null,
    });
  });

  elements.newShoppingItemInput.value = "";
  elements.newShoppingQtyInput.value = "";
  elements.newShoppingPriceInput.value = "";
  elements.newShoppingItemInput.focus();
}

function updateShoppingItem(itemId, patch, options = {}) {
  const note = getSelectedNote();
  if (!note || note.trashed || (note.finalized && !isDoneOnlyPatch(patch))) return;

  updateSelectedNote((note) => {
    const item = note.shoppingItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    Object.assign(item, patch);
    updateShoppingTotal(note);
  }, options);
}

function removeShoppingItem(itemId) {
  if (!canEditNoteContent(getSelectedNote())) return;

  updateSelectedNote((note) => {
    note.shoppingItems = note.shoppingItems.filter((item) => item.id !== itemId);
  });
}


function updateGoalData(patch, options = {}) {
  const note = getSelectedNote();
  if (!canEditNoteContent(note) || note.type !== "goal") return;

  updateSelectedNote((note) => {
    const goal = ensureGoal(note);
    Object.assign(goal, patch);
    goal.target = normalizeNumber(goal.target, 0);
    goal.saved = normalizeNumber(goal.saved, 0);
    goal.category = String(goal.category || "").trim() || "Sem categoria";
    goal.color = normalizeAccent(goal.color || preferences.defaultFolderColor);
    goal.startDate = normalizeDateInput(goal.startDate, formatDateInput(new Date()));
    goal.targetDate = normalizeDateInput(goal.targetDate, addDaysDateInput(goal.startDate, 130));
    goal.hasTargetDate = Boolean(goal.hasTargetDate);
    goal.notify = false;
    goal.recommendationMode = normalizeGoalRecommendationMode(goal.recommendationMode);
    goal.totalMode = normalizeGoalTotalMode(goal.totalMode);
    if (options.syncTitle) note.title = goal.name.trim() || "Nova meta";
  }, { renderEditor: options.renderEditor !== false });
}

function handleGoalSummaryAction(event) {
  const action = event.target.closest("[data-goal-action]")?.dataset.goalAction;
  const recommendationMode = event.target.closest("[data-goal-mode]")?.dataset.goalMode;
  const totalMode = event.target.closest("[data-goal-total-mode]")?.dataset.goalTotalMode;
  if (recommendationMode) return changeGoalSummaryPreference({ recommendationMode });
  if (totalMode) return changeGoalSummaryPreference({ totalMode });
  if (!action) return;
  if (action === "edit") {
    const note = getSelectedNote();
    if (!note || note.trashed) return;
    note.finalized = false;
    note.updatedAt = Date.now();
    saveState();
    render();
    showToast("Modo de edição ativado");
    return;
  }
  if (action === "add" || action === "withdraw") changeGoalSavedAmount(action === "add" ? 1 : -1);
}

function changeGoalSummaryPreference(patch) {
  const note = getSelectedNote();
  if (!note || note.type !== "goal") return;
  const goal = ensureGoal(note);
  Object.assign(goal, patch);
  goal.recommendationMode = normalizeGoalRecommendationMode(goal.recommendationMode);
  goal.totalMode = normalizeGoalTotalMode(goal.totalMode);
  note.updatedAt = Date.now();
  saveState();
  renderEditor();
}

function changeGoalSavedAmount(direction) {
  const note = getSelectedNote();
  if (!note || note.type !== "goal" || note.trashed) return;
  const raw = prompt(direction > 0 ? "Valor para adicionar:" : "Valor para retirar:");
  const amount = parseMoneyInput(raw);
  if (!amount) return;
  const goal = ensureGoal(note);
  goal.saved = Math.max(0, normalizeNumber(goal.saved, 0) + direction * amount);
  note.updatedAt = Date.now();
  saveState();
  render();
  showToast(direction > 0 ? "Dinheiro adicionado" : "Dinheiro retirado");
}

function reorderDraggedNote(targetNoteId) {
  if (!draggedNoteId || draggedNoteId === targetNoteId) return;

  const visibleNotes = getVisibleNotes();
  const draggedIndex = visibleNotes.findIndex((note) => note.id === draggedNoteId);
  const targetIndex = visibleNotes.findIndex((note) => note.id === targetNoteId);
  if (draggedIndex < 0 || targetIndex < 0) return;

  const [dragged] = visibleNotes.splice(draggedIndex, 1);
  visibleNotes.splice(targetIndex, 0, dragged);

  visibleNotes.forEach((note, index) => {
    note.order = index;
  });

  saveState();
  renderNotes();
  showToast("Notas reorganizadas");
}

function moveDraggedNoteToFolder(folderId) {
  if (!draggedNoteId) return;

  const note = state.notes.find((item) => item.id === draggedNoteId);
  if (!note) return;

  note.folderId = folderId;
  note.trashed = false;
  note.archived = false;
  note.updatedAt = Date.now();
  currentView = `folder:${folderId}`;
  selectedNoteId = note.id;
  saveState();
  render();
  showToast("Nota movida para a pasta");
}

function moveDraggedNoteToView(view) {
  if (!draggedNoteId) return;
  const note = state.notes.find((item) => item.id === draggedNoteId);
  if (!note) return;

  if (view === "pinned") {
    note.pinned = true;
    note.trashed = false;
    note.archived = false;
    currentView = "pinned";
    showToast("Nota fixada");
  } else if (view === "trash") {
    note.trashed = true;
    note.archived = false;
    note.pinned = false;
    currentView = "trash";
    showToast("Nota movida para a lixeira");
  } else if (view === "all") {
    note.trashed = false;
    note.archived = false;
    currentView = "all";
    showToast("Nota movida para todas");
  } else {
    return;
  }

  note.updatedAt = Date.now();
  selectedNoteId = note.id;
  saveState();
  render();
}

function renderFolderSettings() {
  if (!elements.folderSettingsList) return;
  elements.folderSettingsList.replaceChildren();
  state.folders.slice().sort((a, b) => a.order - b.order).forEach((folder) => {
    const row = document.createElement("article");
    row.className = "folder-settings-row";
    row.dataset.folderId = folder.id;
    row.innerHTML = `
      <span class="folder-color-dot" style="--folder-color:${folder.color || preferences.defaultFolderColor}"></span>
      <strong>${folder.name}</strong>
      <button class="secondary-action" type="button" data-folder-action="edit">Configurar</button>
    `;
    elements.folderSettingsList.append(row);
  });
}

function handleFolderSettingsClick(event) {
  const row = event.target.closest(".folder-settings-row");
  if (!row) return;
  openFolderDialog(row.dataset.folderId);
}

function openFolderDialog(folderId) {
  const folder = getFolder(folderId);
  if (!folder) return;
  editingFolderId = folderId;
  selectedFolderColor = folder.color || preferences.defaultFolderColor;
  elements.folderNameInput.value = folder.name;
  renderFolderDialogColors();
  elements.modalLayer.hidden = false;
  elements.folderEditDialog.hidden = false;
}

function renderFolderDialogColors() {
  elements.folderDialogColors.replaceChildren();
  FOLDER_COLORS.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-swatch";
    button.dataset.color = color;
    button.style.setProperty("--swatch", color);
    button.classList.toggle("active", color.toLowerCase() === normalizeAccent(selectedFolderColor).toLowerCase());
    elements.folderDialogColors.append(button);
  });
}

function handleFolderDialogColorClick(event) {
  const button = event.target.closest("[data-color]");
  if (!button) return;
  selectedFolderColor = button.dataset.color;
  renderFolderDialogColors();
}

function saveFolderDialog() {
  const folder = getFolder(editingFolderId);
  if (!folder) return;
  folder.name = elements.folderNameInput.value.trim() || "Nova pasta";
  folder.color = normalizeAccent(selectedFolderColor);
  saveState();
  closeFolderDialog();
  render();
  showToast("Pasta atualizada");
}

function deleteFolderFromDialog() {
  const folder = getFolder(editingFolderId);
  if (!folder) return;
  const shouldDelete = confirm(`Excluir a pasta "${folder.name}"? As notas ficarão sem pasta.`);
  if (!shouldDelete) return;
  state.notes.forEach((note) => {
    if (note.folderId === folder.id) note.folderId = "";
  });
  state.folders = state.folders.filter((item) => item.id !== folder.id);
  currentView = "all";
  saveState();
  closeFolderDialog();
  render();
  showToast("Pasta excluída");
}

function closeFolderDialog() {
  editingFolderId = null;
  elements.folderEditDialog.hidden = true;
  if (elements.settingsModal.hidden && elements.accountModal.hidden && elements.profileEditDialog.hidden) {
    elements.modalLayer.hidden = true;
  }
}

function normalizeOrders() {
  state.notes
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((note, index) => {
      note.order = index;
    });
}

function getNextOrder() {
  return Math.min(0, ...state.notes.map((note) => note.order)) - 1;
}

function getFolder(folderId) {
  return state.folders.find((folder) => folder.id === folderId);
}

function getViewTitle() {
  if (currentView === "all") return "Todas as Notas";
  if (currentView === "pinned") return "Fixadas";
  if (currentView === "trash") return "Lixeira";
  if (currentView.startsWith("folder:")) return getFolder(currentView.replace("folder:", ""))?.name || "Pasta";
  return "Notas";
}

function getViewScope() {
  if (currentView === "trash") return "Excluídas";
  if (currentView === "pinned") return "Prioridade";
  if (currentView.startsWith("folder:")) return "Pasta";
  return "Biblioteca";
}


function createGoalDefaults(now = Date.now()) {
  const startDate = formatDateInput(new Date(now));
  return { name: "", target: 0, saved: 0, category: "Sem categoria", color: "#007aff", startDate, hasTargetDate: true, targetDate: addDaysDateInput(startDate, 130), notify: false, recommendationMode: "day", totalMode: "days" };
}

function normalizeGoal(goal, note = {}) {
  const fallback = createGoalDefaults(note.createdAt || Date.now());
  const source = goal && typeof goal === "object" ? goal : {};
  const startDate = normalizeDateInput(source.startDate, fallback.startDate);
  return { ...fallback, name: typeof source.name === "string" ? source.name : (note.type === "goal" && typeof note.title === "string" && note.title !== "Nova meta" ? note.title : ""), target: normalizeNumber(source.target, fallback.target), saved: normalizeNumber(source.saved, fallback.saved), category: typeof source.category === "string" && source.category.trim() ? source.category.trim() : fallback.category, color: normalizeAccent(source.color || fallback.color), startDate, hasTargetDate: source.hasTargetDate !== undefined ? Boolean(source.hasTargetDate) : fallback.hasTargetDate, targetDate: normalizeDateInput(source.targetDate, addDaysDateInput(startDate, 130)), notify: false, recommendationMode: normalizeGoalRecommendationMode(source.recommendationMode), totalMode: normalizeGoalTotalMode(source.totalMode) };
}

function ensureGoal(note) { note.goal = normalizeGoal(note.goal, note); return note.goal; }

function getGoalPreview(note) {
  const goal = ensureGoal(note);
  const metrics = getGoalMetrics(note);
  return (goal.category || "Sem categoria") + " · " + formatCurrency(goal.saved, "BRL") + " (" + formatPercent(metrics.percent) + ")";
}

function getGoalSummary(note) {
  const goal = ensureGoal(note);
  return goal.category || "Sem categoria";
}

function renderGoalNoteCard(card, note) {
  const goal = ensureGoal(note);
  const metrics = getGoalMetrics(note);
  card.classList.add("goal-note-card");
  const header = card.querySelector(".note-card-header");
  if (header && !header.querySelector(".goal-card-dot")) {
    const dot = document.createElement("span");
    dot.className = "goal-card-dot";
    header.prepend(dot);
  }
  const dot = card.querySelector(".goal-card-dot");
  if (dot) dot.style.setProperty("--goal-color", goal.color);
  const paragraph = card.querySelector("p");
  paragraph.innerHTML = [
    '<span class="goal-card-saved">' + formatCurrency(goal.saved, "BRL") + ' (' + formatPercent(metrics.percent) + ')</span>',
    '<span class="goal-card-progress"><i style="width:' + Math.min(metrics.percent, 100) + '%"></i></span>',
    '<span class="goal-card-target">' + formatCurrency(goal.target, "BRL") + '</span>'
  ].join("");
}

function getGoalChartBars(note) {
  const goal = ensureGoal(note);
  const metrics = getGoalMetrics(note);
  const target = Math.max(1, normalizeNumber(metrics.target, 0));
  const start = parseDateInput(goal.startDate) || stripDate(new Date());
  const targetDate = metrics.hasDeadline ? parseDateInput(goal.targetDate) : null;
  const totalDays = targetDate ? Math.max(1, diffDays(start, targetDate)) : 120;
  const segments = 7;
  const bars = [];

  for (let index = 0; index < segments; index += 1) {
    const ratio = (index + 1) / segments;
    const checkpoint = new Date(start);
    checkpoint.setDate(start.getDate() + Math.round(totalDays * ratio));
    const amount = metrics.target * ratio;
    const label = targetDate
      ? new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(checkpoint).replace(".", "")
      : Math.round(ratio * 100) + "%";

    bars.push({
      label,
      height: Math.max(8, Math.min(100, (amount / target) * 100)),
      title: (targetDate ? formatGoalDate(formatDateInput(checkpoint)) + " \u00b7 " : "") + formatCurrency(amount, "BRL"),
    });
  }

  return {
    title: targetDate ? "Proje\u00e7\u00e3o at\u00e9 " + formatGoalDate(goal.targetDate) : "Marcos financeiros da meta",
    bars,
  };
}

function getGoalMetrics(note) {
  const goal = ensureGoal(note);
  const target = normalizeNumber(goal.target, 0);
  const saved = normalizeNumber(goal.saved, 0);
  const remaining = Math.max(0, target - saved);
  const percent = target > 0 ? (saved / target) * 100 : 0;
  const hasDeadline = Boolean(goal.hasTargetDate && goal.targetDate);
  const today = stripDate(new Date());
  const start = parseDateInput(goal.startDate) || today;
  const targetDate = hasDeadline ? parseDateInput(goal.targetDate) : null;
  const totalDays = targetDate ? Math.max(1, diffDays(start, targetDate)) : 0;
  const remainingDays = targetDate ? Math.max(0, diffDays(today, targetDate)) : 0;
  const divisor = getGoalRecommendationDivisor(remainingDays, goal.recommendationMode);
  return { target, saved, remaining, percent, hasDeadline, totalDays, remainingDays, recommendation: hasDeadline && divisor > 0 ? remaining / divisor : remaining };
}

function getGoalRecommendationDivisor(days, mode) { if (mode === "week") return Math.max(1, Math.ceil(days / 7)); if (mode === "month") return Math.max(1, Math.ceil(days / 30)); return Math.max(1, days); }
function renderGoalModeButton(mode, label, active) { return '<button type="button" class="' + (mode === active ? 'active' : '') + '" data-goal-mode="' + mode + '">' + label + '</button>'; }
function renderGoalTotalModeButton(mode, label, active) { return '<button type="button" class="' + (mode === active ? 'active' : '') + '" data-goal-total-mode="' + mode + '">' + label + '</button>'; }
function getGoalTotalValue(days, mode) { if (!days) return "-"; if (mode === "months") return String(Math.max(1, Math.ceil(days / 30.44))); if (mode === "weeks") return String(Math.max(1, Math.ceil(days / 7))); return String(days); }

function formatDurationParts(days) {
  const safeDays = Math.max(0, Math.round(days || 0));
  const months = Math.floor(safeDays / 30.44);
  const restAfterMonths = Math.max(0, Math.round(safeDays - months * 30.44));
  const weeks = Math.floor(restAfterMonths / 7);
  const restDays = Math.max(0, restAfterMonths - weeks * 7);
  return { months, weeks, days: restDays };
}

function normalizeGoalRecommendationMode(mode) { return ["day", "week", "month"].includes(mode) ? mode : "day"; }
function normalizeGoalTotalMode(mode) { return ["months", "weeks", "days"].includes(mode) ? mode : "days"; }
function formatPercent(value) { return normalizeNumber(value, 0).toFixed(2).replace(".", ",") + "%"; }

function formatDateInput(date) {
  const current = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(current.getTime())) return formatDateInput(new Date());
  const year = current.getFullYear();
  const month = String(current.getMonth() + 1).padStart(2, "0");
  const day = String(current.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function addDaysDateInput(dateInput, days) { const date = parseDateInput(dateInput) || new Date(); date.setDate(date.getDate() + days); return formatDateInput(date); }
function normalizeDateInput(value, fallback) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : fallback; }
function parseDateInput(value) { if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null; const [year, month, day] = String(value).split("-").map(Number); return new Date(year, month - 1, day); }
function stripDate(date) { return new Date(date.getFullYear(), date.getMonth(), date.getDate()); }
function diffDays(start, end) { return Math.ceil((stripDate(end) - stripDate(start)) / 86400000); }
function formatGoalDate(value) { const date = parseDateInput(value); return date ? new Intl.DateTimeFormat("pt-BR").format(date) : "Sem data"; }
function parseMoneyInput(value) { const raw = String(value || "").trim(); if (!raw) return 0; const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw; return normalizeNumber(normalized, 0); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }

function getNotePreview(note) {
  if (note.type === "goal") return getGoalPreview(note);

  if (note.type === "checklist") {
    const remaining = note.items.filter((item) => !item.done).map((item) => item.text).filter(Boolean);
    const done = note.items.filter((item) => item.done).length;
    if (remaining.length) return remaining.slice(0, 3).join(" · ");
    if (note.items.length) return `${done} ${done === 1 ? "item concluído" : "itens concluídos"}`;
    return getAttachmentSummary(note) || "Checklist vazio";
  }

  if (note.type === "shopping") {
    const pending = note.shoppingItems.filter((item) => !item.done).map((item) => item.text).filter(Boolean);
    if (pending.length) return `${pending.slice(0, 3).join(" · ")} · ${formatCurrency(getShoppingTotal(note), note.currency)}`;
    if (note.shoppingItems.length) return `Total ${formatCurrency(getShoppingTotal(note), note.currency)}`;
    return "Lista de compras vazia";
  }

  return getTextFromBlocks(note).trim() || getAttachmentSummary(note) || "Nota vazia";
}

function getAttachmentSummary(note) {
  if (!note.attachments.length) return "";
  return `${note.attachments.length} ${note.attachments.length === 1 ? "anexo" : "anexos"}`;
}

function renderNoteThumbnail(card, note) {
  const thumb = card.querySelector(".note-thumb");
  const attachment = note.attachments.find((item) => item.type.startsWith("image/") || item.type.startsWith("video/"));

  if (!attachment) {
    thumb.hidden = true;
    return;
  }

  thumb.hidden = false;
  thumb.replaceChildren();

  if (attachment.type.startsWith("image/")) {
    const image = document.createElement("img");
    image.src = attachment.dataUrl;
    image.alt = "";
    thumb.append(image);
    return;
  }

  thumb.innerHTML = `<svg><use href="#icon-image"></use></svg>`;
}

function normalizeNoteBlocks(note) {
  if (Array.isArray(note.blocks) && note.blocks.length) {
    return note.blocks
      .map((block) => {
        if (block?.type === "image" && block.attachmentId) {
          return { id: block.id || cryptoId(), type: "image", attachmentId: String(block.attachmentId) };
        }
        const html = typeof block?.html === "string" ? sanitizeRichHtml(block.html) : "";
        return {
          id: block?.id || cryptoId(),
          type: "text",
          text: typeof block?.text === "string" ? block.text : getPlainTextFromHtml(html),
          html,
        };
      })
      .filter(Boolean);
  }

  const blocks = [{ id: cryptoId(), type: "text", text: typeof note.content === "string" ? note.content : "", html: "" }];
  if (Array.isArray(note.attachments)) {
    note.attachments
      .filter((attachment) => attachment?.id && typeof attachment.type === "string" && attachment.type.startsWith("image/"))
      .forEach((attachment) => blocks.push({ id: cryptoId(), type: "image", attachmentId: String(attachment.id) }));
  }
  blocks.push({ id: cryptoId(), type: "text", text: "", html: "" });
  return blocks;
}

function normalizeInlineImage(image) {
  if (!image?.dataUrl) return null;
  return {
    id: image.id || cryptoId(),
    name: typeof image.name === "string" ? image.name : "Imagem",
    type: typeof image.type === "string" ? image.type : "image/*",
    size: Number.isFinite(image.size) ? image.size : 0,
    dataUrl: image.dataUrl,
    createdAt: Number.isFinite(image.createdAt) ? image.createdAt : Date.now(),
  };
}

function ensureNoteTextBlock(note) {
  if (!Array.isArray(note.blocks)) note.blocks = [];
  if (note.blocks.length === 0) {
    note.blocks.push({ id: cryptoId(), type: "text", text: note.content || "", html: "" });
  }
  const last = note.blocks[note.blocks.length - 1];
  if (last?.type === "image") {
    note.blocks.push({ id: cryptoId(), type: "text", text: "", html: "" });
  }
}

function getTextFromBlocks(note) {
  return (note.blocks || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text || getPlainTextFromHtml(block.html || ""))
    .join("\n")
    .trim();
}

function rememberTextCursor(blockId, textarea) {
  activeTextBlockId = blockId;
  activeTextSelection = {
    start: textarea.selectionStart ?? textarea.value.length,
    end: textarea.selectionEnd ?? textarea.value.length,
  };
}

function autoResizeTextarea(textarea) {
  textarea.style.height = "auto";
  textarea.style.height = `${Math.max(textarea.scrollHeight, 42)}px`;
}

function bindRichTextEditor(editor) {
  if (!editor) return;
  const remember = () => rememberRichTextEditor(editor);
  editor.addEventListener("focus", remember);
  editor.addEventListener("click", remember);
  editor.addEventListener("keyup", remember);
  editor.addEventListener("mouseup", remember);
  editor.addEventListener("input", () => {
    persistRichEditor(editor);
    rememberRichTextEditor(editor);
  });
  editor.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text/plain") || "";
    restoreRichSelection(editor);
    document.execCommand("insertText", false, text);
    normalizeEditorMarkup(editor);
    persistRichEditor(editor);
    rememberRichTextEditor(editor);
  });
  editor.addEventListener("contextmenu", (event) => {
    const range = getCurrentRichSelectionRange(editor);
    if (!range || range.collapsed) return;
    event.preventDefault();
    rememberRichTextEditor(editor);
    showTextFormatMenu(event.clientX, event.clientY, editor);
  });
  editor.addEventListener("pointerdown", (event) => handleRichEditorPointerDown(event, editor));
  editor.addEventListener("pointermove", handleRichEditorPointerMove);
  editor.addEventListener("pointerup", clearRichTextPressTimer);
  editor.addEventListener("pointercancel", clearRichTextPressTimer);
}

function handleRichEditorPointerDown(event, editor) {
  clearRichTextPressTimer();
  if (!isMobileLayout() || event.pointerType === "mouse" || event.button !== 0) return;
  richTextPressPoint = { x: event.clientX, y: event.clientY };
  richTextPressTimer = window.setTimeout(() => {
    const range = getCurrentRichSelectionRange(editor);
    if (!range || range.collapsed) return;
    rememberRichTextEditor(editor);
    showTextFormatMenu(richTextPressPoint.x, richTextPressPoint.y, editor);
  }, 520);
}

function handleRichEditorPointerMove(event) {
  if (!richTextPressTimer || !richTextPressPoint) return;
  const deltaX = Math.abs(event.clientX - richTextPressPoint.x);
  const deltaY = Math.abs(event.clientY - richTextPressPoint.y);
  if (deltaX > 10 || deltaY > 10) clearRichTextPressTimer();
}

function clearRichTextPressTimer() {
  if (richTextPressTimer) window.clearTimeout(richTextPressTimer);
  richTextPressTimer = 0;
  richTextPressPoint = null;
}

function getCurrentRichSelectionRange(editor = getActiveRichEditor()) {
  const selection = window.getSelection?.();
  if (!editor || !selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  return isRangeInsideEditor(editor, range) ? range : null;
}

function rememberRichTextEditor(editor) {
  if (!editor) return;
  activeRichEditor = editor;
  activeTextBlockId = editor.dataset.blockId || "";
  activeTextSelection = null;
  const selection = window.getSelection?.();
  if (selection?.rangeCount && editor.contains(selection.anchorNode)) {
    activeRichRange = selection.getRangeAt(0).cloneRange();
    activeRichSelection = captureRichSelection(editor, activeRichRange);
  }
}

function handleRichSelectionChange() {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return;
  const node = selection.anchorNode;
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  const editor = element?.closest?.("[data-rich-editor]");
  if (!editor || !editor.isContentEditable) return;
  rememberRichTextEditor(editor);
}

function getActiveRichEditor() {
  if (activeRichEditor && document.contains(activeRichEditor) && activeRichEditor.isContentEditable) return activeRichEditor;
  const selection = window.getSelection?.();
  const node = selection?.anchorNode;
  const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
  return element?.closest?.("[data-rich-editor]") || null;
}

function restoreRichSelection(editor = getActiveRichEditor()) {
  if (!editor) return false;
  editor.focus({ preventScroll: true });
  const selection = window.getSelection?.();
  if (!selection) return true;

  if (activeRichSelection && isSameRichEditor(editor, activeRichSelection)) {
    const restoredRange = createRangeFromTextOffsets(editor, activeRichSelection.start, activeRichSelection.end);
    if (restoredRange) {
      selection.removeAllRanges();
      selection.addRange(restoredRange);
      activeRichRange = restoredRange.cloneRange();
      return true;
    }
  }

  if (!activeRichRange || !isRangeInsideEditor(editor, activeRichRange)) return true;
  selection.removeAllRanges();
  selection.addRange(activeRichRange);
  return true;
}

function captureRichSelection(editor, range) {
  if (!editor || !range || !isRangeInsideEditor(editor, range)) return null;
  const preStart = range.cloneRange();
  preStart.selectNodeContents(editor);
  preStart.setEnd(range.startContainer, range.startOffset);

  const preEnd = range.cloneRange();
  preEnd.selectNodeContents(editor);
  preEnd.setEnd(range.endContainer, range.endOffset);

  return {
    ...getRichEditorIdentity(editor),
    start: preStart.toString().length,
    end: preEnd.toString().length,
  };
}

function getRichEditorIdentity(editor) {
  return {
    kind: editor?.dataset.richKind || "",
    blockId: editor?.dataset.blockId || "",
    itemId: editor?.dataset.itemId || "",
  };
}

function isSameRichEditor(editor, snapshot) {
  const identity = getRichEditorIdentity(editor);
  return Boolean(snapshot && identity.kind === snapshot.kind && identity.blockId === snapshot.blockId && identity.itemId === snapshot.itemId);
}

function isRangeInsideEditor(editor, range) {
  return Boolean(editor && range && editor.contains(range.commonAncestorContainer));
}

function createRangeFromTextOffsets(editor, start, end) {
  if (!editor) return null;
  const textLength = editor.innerText.length;
  const safeStart = Math.max(0, Math.min(Number(start) || 0, textLength));
  const safeEnd = Math.max(safeStart, Math.min(Number(end) || safeStart, textLength));
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  let current = 0;
  let startSet = false;
  let lastTextNode = null;

  while (walker.nextNode()) {
    const node = walker.currentNode;
    lastTextNode = node;
    const next = current + node.nodeValue.length;
    if (!startSet && safeStart <= next) {
      range.setStart(node, Math.max(0, safeStart - current));
      startSet = true;
    }
    if (startSet && safeEnd <= next) {
      range.setEnd(node, Math.max(0, safeEnd - current));
      return range;
    }
    current = next;
  }

  if (lastTextNode) {
    const length = lastTextNode.nodeValue.length;
    if (!startSet) range.setStart(lastTextNode, length);
    range.setEnd(lastTextNode, length);
    return range;
  }

  range.selectNodeContents(editor);
  range.collapse(false);
  return range;
}

function applyInlineStyleToSelection(editor, styles = {}) {
  const selection = window.getSelection?.();
  if (!selection?.rangeCount) return false;
  const range = selection.getRangeAt(0);
  if (range.collapsed || !isRangeInsideEditor(editor, range)) return false;

  const fragment = range.extractContents();
  stripConflictingInlineStyles(fragment, styles);
  const span = document.createElement("span");
  if (styles.fontSize) span.style.fontSize = styles.fontSize;
  if (styles.color) span.style.color = styles.color;
  span.append(fragment);
  range.insertNode(span);

  const nextRange = document.createRange();
  nextRange.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(nextRange);
  activeRichRange = nextRange.cloneRange();
  activeRichSelection = captureRichSelection(editor, nextRange);
  return true;
}

function stripConflictingInlineStyles(root, styles = {}) {
  const spans = root.querySelectorAll ? Array.from(root.querySelectorAll("span")) : [];
  spans.forEach((span) => {
    if (styles.fontSize) span.style.fontSize = "";
    if (styles.color) span.style.color = "";
    if (!span.getAttribute("style")) unwrapElement(span);
  });
}

function unwrapElement(element) {
  const fragment = document.createDocumentFragment();
  while (element.firstChild) fragment.append(element.firstChild);
  element.replaceWith(fragment);
}

function handleTextFormatMouseDown(event) {
  if (event.target.closest("button, .color-swatch")) {
    event.preventDefault();
  }
}

function handleTextFormatClick(event) {
  const sizeButton = event.target.closest("#formatSizeButton");
  if (sizeButton) {
    toggleFormatSizeMenu();
    return;
  }

  const commandButton = event.target.closest("[data-format-command]");
  if (commandButton) {
    applyTextFormat(commandButton.dataset.formatCommand);
    return;
  }

  const colorButton = event.target.closest("[data-color]");
  if (colorButton) {
    applyTextFormat("foreColor", colorButton.dataset.color);
  }
}

function preserveRichTextMenuSelection(event) {
  if (event.target.closest("button")) event.preventDefault();
}

function toggleFormatSizeMenu() {
  rememberRichTextEditor(getActiveRichEditor());
  if (!elements.formatSizeMenu?.hidden) {
    closeFormatSizeMenu();
    return;
  }
  showFormatSizeMenu();
}

function showFormatSizeMenu() {
  if (!elements.formatSizeMenu || !elements.formatSizeButton) return;
  closeTextFormatMenu();
  renderTextSizeOptions(elements.formatSizeMenu);
  elements.formatSizeMenu.hidden = false;
  elements.formatSizeButton.setAttribute("aria-expanded", "true");
  elements.formatSizeMenu.style.left = "0px";
  elements.formatSizeMenu.style.top = "0px";

  const buttonBounds = elements.formatSizeButton.getBoundingClientRect();
  const menuBounds = elements.formatSizeMenu.getBoundingClientRect();
  const left = Math.max(10, Math.min(window.innerWidth - menuBounds.width - 10, buttonBounds.left));
  const below = buttonBounds.bottom + 8;
  const above = buttonBounds.top - menuBounds.height - 8;
  const top = below + menuBounds.height > window.innerHeight - 10 ? Math.max(10, above) : below;
  elements.formatSizeMenu.style.left = `${left}px`;
  elements.formatSizeMenu.style.top = `${top}px`;
}

function closeFormatSizeMenu() {
  if (elements.formatSizeMenu) elements.formatSizeMenu.hidden = true;
  elements.formatSizeButton?.setAttribute("aria-expanded", "false");
}

function handleFormatSizeMenuClick(event) {
  const sizeButton = event.target.closest("[data-format-size]");
  if (!sizeButton) return;
  applyTextFormat("fontSize", sizeButton.dataset.formatSize);
  closeFormatSizeMenu();
}

function handleTextFormatMenuClick(event) {
  const commandButton = event.target.closest("[data-format-command]");
  if (commandButton) {
    applyTextFormat(commandButton.dataset.formatCommand);
    closeTextFormatMenu();
    return;
  }

  const sizeButton = event.target.closest("[data-format-size]");
  if (sizeButton) {
    applyTextFormat("fontSize", sizeButton.dataset.formatSize);
    closeTextFormatMenu();
  }
}

function showTextFormatMenu(x, y, editor = getActiveRichEditor()) {
  if (!elements.textFormatMenu || !editor) return;
  const note = getSelectedNote();
  if (!canEditNoteContent(note) || note.type === "goal") return;

  rememberRichTextEditor(editor);
  closeFormatSizeMenu();
  closeMobileNoteActionMenu();
  closeMobileFolderMoveMenu();
  closeSiteContextMenu();
  closeToolbarContextMenu();
  renderTextSizeOptions(elements.textFormatSizeOptions);

  elements.textFormatMenu.hidden = false;
  elements.textFormatMenu.style.left = "0px";
  elements.textFormatMenu.style.top = "0px";
  const bounds = elements.textFormatMenu.getBoundingClientRect();
  const safeX = Number.isFinite(x) ? x : window.innerWidth / 2;
  const safeY = Number.isFinite(y) ? y : window.innerHeight / 2;
  const left = Math.max(10, Math.min(window.innerWidth - bounds.width - 10, safeX));
  const below = safeY + 10;
  const above = safeY - bounds.height - 10;
  const top = below + bounds.height > window.innerHeight - 10 ? Math.max(10, above) : below;
  elements.textFormatMenu.style.left = `${left}px`;
  elements.textFormatMenu.style.top = `${top}px`;
}

function closeTextFormatMenu() {
  if (elements.textFormatMenu) elements.textFormatMenu.hidden = true;
}

function renderTextSizeOptions(container) {
  if (!container) return;
  const currentSize = String(elements.formatSizeValue?.textContent || "16");
  container.replaceChildren(
    ...TEXT_SIZE_OPTIONS.map((size) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.formatSize = String(size);
      button.className = "format-size-option";
      button.classList.toggle("active", String(size) === currentSize);
      button.textContent = String(size);
      return button;
    })
  );
}

function setFormatSizeValue(value) {
  const size = normalizeTextSize(value);
  if (elements.formatSizeValue) elements.formatSizeValue.textContent = String(size);
}

function applyTextFormat(command, value = "", options = {}) {
  const editor = getActiveRichEditor();
  const note = getSelectedNote();
  if (!editor || !canEditNoteContent(note) || note.type === "goal") {
    if (!options.silent) showToast("Selecione um texto editável");
    return;
  }

  restoreRichSelection(editor);
  if (command === "fontSize") {
    const size = normalizeTextSize(value);
    if (!applyInlineStyleToSelection(editor, { fontSize: size + "px" }) && !options.silent) {
      showToast("Selecione o texto para alterar o tamanho");
      return;
    }
    setFormatSizeValue(size);
  } else if (command === "foreColor") {
    if (!applyInlineStyleToSelection(editor, { color: normalizeAccent(value) }) && !options.silent) {
      showToast("Selecione o texto para alterar a cor");
      return;
    }
  } else {
    document.execCommand(command, false, null);
  }

  normalizeEditorMarkup(editor);
  persistRichEditor(editor);
  rememberRichTextEditor(editor);
}

function renderTextFormatToolbar(note = getSelectedNote()) {
  if (!elements.textFormatToolbar || !elements.formatColorOptions) return;
  placeTextFormatToolbar();
  const enabled = Boolean(note && !note.trashed && !note.finalized && note.type !== "goal");
  elements.textFormatToolbar.hidden = !enabled;
  if (!enabled) {
    closeFormatSizeMenu();
    closeTextFormatMenu();
    return;
  }
  renderTextSizeOptions(elements.formatSizeMenu);
  renderTextSizeOptions(elements.textFormatSizeOptions);
  renderColorButtons(elements.formatColorOptions, ACCENT_COLORS, preferences.accent, (color) => applyTextFormat("foreColor", color));
}

function placeTextFormatToolbar() {
  if (!elements.textFormatToolbar) return;
  placeRichTextMenus();
  if (isMobileLayout()) {
    if (elements.textFormatToolbar.parentElement !== document.body) {
      document.body.append(elements.textFormatToolbar);
    }
    return;
  }

  if (elements.editorToolbar && elements.textFormatToolbar.parentElement !== elements.editorToolbar) {
    elements.editorToolbar.insertBefore(elements.textFormatToolbar, elements.finalizeNoteButton);
  }
}

function placeRichTextMenus() {
  [elements.formatSizeMenu, elements.textFormatMenu].forEach((menu) => {
    if (menu && menu.parentElement !== document.body) document.body.append(menu);
  });
}

function persistRichEditor(editor) {
  const note = getSelectedNote();
  if (!canEditNoteContent(note)) return;
  const html = sanitizeRichHtml(editor.innerHTML, { trim: false });
  const text = getPlainTextFromHtml(html);
  const kind = editor.dataset.richKind;

  if (kind === "note") {
    const block = (note.blocks || []).find((candidate) => candidate.id === editor.dataset.blockId);
    if (!block) return;
    block.html = html;
    block.text = text;
    note.content = getTextFromBlocks(note);
  }

  if (kind === "checklist") {
    const item = note.items.find((candidate) => candidate.id === editor.dataset.itemId);
    if (!item) return;
    item.html = html;
    item.text = text;
  }

  if (kind === "shopping") {
    const item = note.shoppingItems.find((candidate) => candidate.id === editor.dataset.itemId);
    if (!item) return;
    item.html = html;
    item.text = text;
  }

  note.updatedAt = Date.now();
  saveState();
  renderSidebar();
  renderNotes();
  if (elements.updatedLabel) elements.updatedLabel.textContent = `Editado ${formatRelativeTime(note.updatedAt)}`;
}

function normalizeEditorMarkup(editor) {
  if (!editor) return;
  convertLegacyFontTags(editor);
  const clean = sanitizeRichHtml(editor.innerHTML, { trim: false });
  if (editor.innerHTML !== clean) editor.innerHTML = clean;
}

function convertLegacyFontTags(root, forcedStyle = {}) {
  root.querySelectorAll("font").forEach((font) => {
    const span = document.createElement("span");
    const color = normalizeCssColor(forcedStyle.color || font.getAttribute("color") || font.style.color);
    const fontSize = forcedStyle.fontSize || legacyFontSizeToCss(font.getAttribute("size")) || normalizeCssFontSize(font.style.fontSize);
    if (color) span.style.color = color;
    if (fontSize) span.style.fontSize = fontSize;
    while (font.firstChild) span.append(font.firstChild);
    font.replaceWith(span);
  });
}

function getRichBlockHtml(block) {
  const html = sanitizeRichHtml(block?.html || "", { trim: false });
  if (html) return html;
  return plainTextToHtml(block?.text || "");
}

function getRichItemHtml(item) {
  const html = sanitizeRichHtml(item?.html || "", { trim: false });
  if (html) return html;
  return plainTextToHtml(item?.text || "");
}

function sanitizeRichHtml(html = "", options = {}) {
  const shouldTrim = options.trim !== false;
  const container = document.createElement("div");
  container.innerHTML = String(html || "");
  container.querySelectorAll("script, style, iframe, object, embed, link, meta").forEach((node) => node.remove());
  container.querySelectorAll("font").forEach((font) => {
    const span = document.createElement("span");
    const color = normalizeCssColor(font.getAttribute("color") || font.style.color);
    const fontSize = legacyFontSizeToCss(font.getAttribute("size")) || normalizeCssFontSize(font.style.fontSize);
    if (color) span.style.color = color;
    if (fontSize) span.style.fontSize = fontSize;
    while (font.firstChild) span.append(font.firstChild);
    font.replaceWith(span);
  });

  const allowed = new Set(["B", "STRONG", "I", "EM", "U", "SPAN", "BR", "DIV", "P"]);
  Array.from(container.querySelectorAll("*")).forEach((element) => {
    if (!allowed.has(element.tagName)) {
      const fragment = document.createDocumentFragment();
      while (element.firstChild) fragment.append(element.firstChild);
      element.replaceWith(fragment);
      return;
    }

    const color = normalizeCssColor(element.style.color);
    const fontSize = normalizeCssFontSize(element.style.fontSize);
    Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
    if (element.tagName === "SPAN") {
      if (color) element.style.color = color;
      if (fontSize) element.style.fontSize = fontSize;
    }
  });
  container.querySelectorAll("span").forEach((span) => {
    if (!span.textContent && !span.querySelector("br")) span.remove();
  });

  let clean = container.innerHTML.replace(/<div><br><\/div>/gi, "<br>");
  if (shouldTrim) {
    clean = clean.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi, "").trim();
  }
  return clean;
}

function plainTextToHtml(text = "") {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function getPlainTextFromHtml(html = "") {
  const container = document.createElement("div");
  container.innerHTML = sanitizeRichHtml(html);
  return (container.innerText || container.textContent || "").replace(/\u00a0/g, " ").trim();
}

function normalizeTextSize(value) {
  return Math.max(12, Math.min(40, Number.parseInt(value, 10) || 16));
}

function normalizeCssFontSize(value = "") {
  if (!value) return "";
  const pixels = Number.parseFloat(String(value));
  if (!Number.isFinite(pixels)) return "";
  return normalizeTextSize(pixels) + "px";
}

function legacyFontSizeToCss(size = "") {
  const map = { 1: 12, 2: 14, 3: 16, 4: 18, 5: 22, 6: 28, 7: 34 };
  return map[size] ? map[size] + "px" : "";
}

function normalizeCssColor(value = "") {
  const color = String(value || "").trim();
  if (!color) return "";
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)) return color;
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(color)) return color;
  return "";
}

function getAttachment(note, attachmentId) {
  return note.attachments.find((attachment) => attachment.id === attachmentId);
}

function insertImageAttachmentsIntoNote(note, imageAttachments) {
  if (!imageAttachments.length) return;
  ensureNoteTextBlock(note);

  let insertIndex = note.blocks.findIndex((block) => block.id === activeTextBlockId && block.type === "text");
  if (insertIndex < 0) {
    insertIndex = note.blocks.length - 1;
  }

  const target = note.blocks[insertIndex];
  const imageBlocks = imageAttachments.map((attachment) => ({ id: cryptoId(), type: "image", attachmentId: attachment.id }));
  const afterTextBlock = { id: cryptoId(), type: "text", text: "", html: "" };

  if (target?.type === "text") {
    const text = target.text || "";
    if (target.html || !activeTextSelection) {
      note.blocks.splice(insertIndex + 1, 0, ...imageBlocks, afterTextBlock);
    } else {
      const start = Math.max(0, Math.min(activeTextSelection.start ?? text.length, text.length));
      const end = Math.max(start, Math.min(activeTextSelection.end ?? start, text.length));
      const before = text.slice(0, start);
      const after = text.slice(end);
      target.text = before;
      target.html = "";
      afterTextBlock.text = after;
      note.blocks.splice(insertIndex + 1, 0, ...imageBlocks, afterTextBlock);
    }
  } else {
    note.blocks.splice(insertIndex + 1, 0, ...imageBlocks, afterTextBlock);
  }

  activeTextBlockId = afterTextBlock.id;
  activeTextSelection = null;
  note.content = getTextFromBlocks(note);
}

function removeNoteImageBlock(blockId) {
  if (!canEditNoteContent(getSelectedNote())) return;

  updateSelectedNote((note) => {
    const removed = note.blocks.find((block) => block.id === blockId);
    note.blocks = note.blocks.filter((block) => block.id !== blockId);
    if (removed?.attachmentId && !note.blocks.some((block) => block.type === "image" && block.attachmentId === removed.attachmentId)) {
      note.attachments = note.attachments.filter((attachment) => attachment.id !== removed.attachmentId);
    }
    ensureNoteTextBlock(note);
    note.content = getTextFromBlocks(note);
  });
}

function getChecklistSummary(note) {
  const total = note.items.length;
  const done = note.items.filter((item) => item.done).length;
  return total ? `${done}/${total}` : "Checklist";
}

function getShoppingSummary(note) {
  const total = note.shoppingItems.length;
  const done = note.shoppingItems.filter((item) => item.done).length;
  return total ? `${done}/${total} · ${formatCurrency(getShoppingTotal(note), note.currency)}` : "Compras";
}

function getNoteKindLabel(note) {
  if (note.type === "checklist") return getChecklistSummary(note);
  if (note.type === "shopping") return getShoppingSummary(note);
  if (note.type === "goal") return getGoalSummary(note);
  return "Nota";
}

function getNewNoteTitle(type) {
  if (type === "checklist") return "Novo checklist";
  if (type === "shopping") return "Lista de compras";
  if (type === "goal") return "Nova meta";
  return "Nova nota";
}

function normalizeNoteType(type) {
  return ["note", "checklist", "shopping", "goal"].includes(type) ? type : "note";
}

function getShoppingTotal(note) {
  return note.shoppingItems.reduce((total, item) => total + normalizeNumber(item.quantity, 0) * normalizeNumber(item.price, 0), 0);
}

function normalizeNumber(value, fallback = 0) {
  const normalized = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : fallback;
}

function formatInputNumber(value) {
  const number = normalizeNumber(value, 0);
  return number === 0 ? "" : String(number);
}

function formatCurrency(value, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
  }).format(normalizeNumber(value, 0));
}

function getCurrencySymbol(currency = "BRL") {
  const parts = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency || "BRL",
    currencyDisplay: "narrowSymbol",
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value || currency || "BRL";
}

function toggleTheme() {
  const themes = ["light", "dark", "coffee"];
  const current = getResolvedTheme(preferences.theme);
  const index = themes.indexOf(current);
  setThemePreference(themes[(index + 1) % themes.length]);
}

function setThemePreference(theme) {
  preferences.theme = normalizeTheme(theme);
  localStorage.setItem(THEME_KEY, preferences.theme);
  savePreferences();
  applyTheme(preferences.theme);
  renderAppearanceControls();
}

function applyTheme(theme) {
  const normalized = normalizeTheme(theme);
  const resolved = getResolvedTheme(normalized);
  document.documentElement.dataset.theme = resolved;
  elements.themeIcon.setAttribute("href", resolved === "dark" ? "#icon-sun" : "#icon-moon");
  updateBrandAssets(resolved);
}

function getResolvedTheme(theme) {
  return ["light", "dark", "coffee"].includes(theme) ? theme : "light";
}

function updateBrandAssets(theme = getResolvedTheme(preferences.theme)) {
  const resolved = getResolvedTheme(theme);
  const isCollapsed = Boolean(preferences.sidebarCollapsed);
  const markGroup = isCollapsed ? BRAND_ASSETS.iso : BRAND_ASSETS.logo;
  const brandSrc = markGroup[resolved] || markGroup.light;
  const loginBrandSrc = BRAND_ASSETS.loginLogo[resolved] || BRAND_ASSETS.loginLogo.light;
  const faviconSrc = BRAND_ASSETS.favicon[resolved] || BRAND_ASSETS.favicon.light;

  if (elements.brandMark && elements.brandMark.getAttribute("src") !== brandSrc) {
    elements.brandMark.src = brandSrc;
  }
  if (elements.accountBrandMark && elements.accountBrandMark.getAttribute("src") !== loginBrandSrc) {
    elements.accountBrandMark.src = loginBrandSrc;
  }
  if (elements.favicon && elements.favicon.getAttribute("href") !== faviconSrc) {
    elements.favicon.href = faviconSrc;
  }
}

function getPreferredTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function normalizeTheme(theme) {
  return ["light", "dark", "coffee"].includes(theme) ? theme : "light";
}

function getDefaultPreferences() {
  return {
    theme: normalizeTheme(localStorage.getItem(THEME_KEY) || "light"),
    accent: "#b98500",
    defaultFolderColor: "#007aff",
    toolbarItems: DEFAULT_TOOLBAR_ITEMS.slice(),
    toolbarLocked: false,
    toolbarDrawingAdded: true,
    customCursor: true,
    fontFamily: "",
    fontFileName: "",
    fontDataUrl: "",
    sidebarCollapsed: false,
  };
}

function normalizePreferencesData(saved, fallback = getDefaultPreferences()) {
  if (!saved || typeof saved !== "object") return { ...fallback };
  const normalized = {
    ...fallback,
    ...saved,
    theme: normalizeTheme(saved.theme || fallback.theme),
    accent: normalizeAccent(saved.accent || fallback.accent),
    defaultFolderColor: normalizeAccent(saved.defaultFolderColor || fallback.defaultFolderColor),
    toolbarItems: normalizeToolbarItems(saved.toolbarItems),
    toolbarLocked: Boolean(saved.toolbarLocked),
    toolbarDrawingAdded: Boolean(saved.toolbarDrawingAdded),
    customCursor: saved.customCursor !== false,
    sidebarCollapsed: Boolean(saved.sidebarCollapsed),
    fontFamily: typeof saved.fontFamily === "string" ? saved.fontFamily : fallback.fontFamily,
    fontFileName: typeof saved.fontFileName === "string" ? saved.fontFileName : fallback.fontFileName,
    fontDataUrl: typeof saved.fontDataUrl === "string" ? saved.fontDataUrl : fallback.fontDataUrl,
  };
  if (!saved.toolbarDrawingAdded) {
    normalized.toolbarItems = mergeToolbarItemsWithDefaults(normalized.toolbarItems, ["draw", "drawingBlock"]);
    normalized.toolbarDrawingAdded = true;
  }
  return normalized;
}

function loadPreferences() {
  const fallback = getDefaultPreferences();
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    const normalized = normalizePreferencesData(saved, fallback);
    localStorage.setItem(PREFS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.warn("Preferências inválidas. Usando padrão.", error);
    return fallback;
  }
}

function savePreferences() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(preferences));
}

function applyPreferences() {
  const accent = normalizeAccent(preferences.accent);
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent-soft", hexToRgba(accent, 0.15));
  applyCustomFont();
  applyCustomCursor();
  applyToolbarOrder();
  applySidebarCollapsed();
}

function setAccentPreference(accent) {
  preferences.accent = normalizeAccent(accent);
  savePreferences();
  applyPreferences();
  renderAppearanceControls();
}

function setDefaultFolderColor(color) {
  preferences.defaultFolderColor = normalizeAccent(color);
  state.folders.forEach((folder) => {
    folder.color = preferences.defaultFolderColor;
  });
  savePreferences();
  saveState();
  renderSidebar();
  renderAppearanceControls();
  renderFolderSettings();
}

function setFolderColor(folderId, color) {
  const folder = getFolder(folderId);
  if (!folder) return;
  folder.color = normalizeAccent(color);
  saveState();
  renderSidebar();
  renderFolderSettings();
  renderAppearanceControls();
}

async function handleFontImport() {
  const file = elements.fontImportInput.files?.[0];
  elements.fontImportInput.value = "";
  if (!file) return;

  if (file.size > MAX_ATTACHMENT_BYTES) {
    showToast(`Fonte acima de ${formatFileSize(MAX_ATTACHMENT_BYTES)} ignorada`);
    return;
  }

  try {
    preferences.fontFileName = file.name;
    preferences.fontFamily = sanitizeFontFamily(file.name);
    preferences.fontDataUrl = await readFileAsDataUrl(file);
    savePreferences();
    applyPreferences();
    renderAppearanceControls();
    showToast("Fonte importada");
  } catch (error) {
    console.error(error);
    showToast("Não foi possível importar a fonte");
  }
}

function resetCustomFont() {
  if (!preferences.fontFileName && !preferences.fontFamily && !preferences.fontDataUrl) return;

  preferences.fontFileName = "";
  preferences.fontFamily = "";
  preferences.fontDataUrl = "";
  savePreferences();
  applyPreferences();
  renderAppearanceControls();
  showToast("Fonte padr\u00e3o restaurada");
}

function renderAppearanceControls() {
  if (!elements.themeSelect) return;
  const activeTheme = normalizeTheme(preferences.theme);
  const themeOption = getThemeOption(activeTheme);
  const hasCustomFont = Boolean(preferences.fontFileName && preferences.fontDataUrl);
  elements.themeSelect.value = activeTheme;
  elements.themePreviewGroup.hidden = false;
  elements.themeDropdownButton.setAttribute("aria-expanded", "true");
  elements.fontNameLabel.textContent = preferences.fontFileName || "SF Pro / sistema";
  elements.resetFontButton.disabled = !hasCustomFont;
  elements.resetFontButton.setAttribute("aria-disabled", String(!hasCustomFont));
  elements.cursorToggleInput.checked = preferences.customCursor !== false;
  if (elements.themeCurrentIcon) elements.themeCurrentIcon.setAttribute("href", themeOption.icon);
  if (elements.themeCurrentLabel) elements.themeCurrentLabel.textContent = themeOption.label;
  renderColorButtons(elements.accentCarousel, ACCENT_COLORS, preferences.accent, (color) => setAccentPreference(color));
  renderColorButtons(elements.folderDefaultColors, FOLDER_COLORS, preferences.defaultFolderColor, (color) => setDefaultFolderColor(color));
  elements.themePreviewGroup.querySelectorAll("[data-theme-choice]").forEach((button) => {
    const isActive = button.dataset.themeChoice === activeTheme;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  renderFolderSettings();
}

function getThemeOption(theme) {
  return THEME_OPTIONS[normalizeTheme(theme)] || THEME_OPTIONS.light;
}

function toggleThemeMenu(event) {
  event.stopPropagation();
  const nextHidden = !elements.themePreviewGroup.hidden;
  elements.themePreviewGroup.hidden = nextHidden;
  elements.themeDropdownButton.setAttribute("aria-expanded", String(!nextHidden));
}

function closeThemeMenu() {
  if (!elements.themePreviewGroup || !elements.themeDropdownButton) return;
  if (elements.themePreviewGroup.classList.contains("theme-inline-group")) {
    elements.themePreviewGroup.hidden = false;
    elements.themeDropdownButton.setAttribute("aria-expanded", "true");
    return;
  }
  elements.themePreviewGroup.hidden = true;
  elements.themeDropdownButton.setAttribute("aria-expanded", "false");
}

function renderColorButtons(container, colors, activeColor, onClick) {
  container.replaceChildren();
  colors.forEach((color) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-swatch";
    button.style.setProperty("--swatch", color);
    button.dataset.color = color;
    button.classList.toggle("active", color.toLowerCase() === normalizeAccent(activeColor).toLowerCase());
    button.addEventListener("click", () => onClick(color));
    container.append(button);
  });
}

function normalizeToolbarItems(items) {
  const source = Array.isArray(items) ? items : DEFAULT_TOOLBAR_ITEMS;
  const validKeys = new Set(Object.keys(TOOLBAR_LABELS));
  const output = [];
  const seen = new Set();

  source.forEach((item) => {
    const key = String(item || "");
    if (key.startsWith("separator-")) {
      output.push(key);
      return;
    }
    if (validKeys.has(key) && !seen.has(key)) {
      seen.add(key);
      output.push(key);
    }
  });

  if (!Array.isArray(items) || !seen.has("search")) return DEFAULT_TOOLBAR_ITEMS.slice();
  return output.length ? output : DEFAULT_TOOLBAR_ITEMS.slice();
}

function mergeToolbarItemsWithDefaults(items, keys) {
  const output = Array.isArray(items) ? items.slice() : DEFAULT_TOOLBAR_ITEMS.slice();
  keys.forEach((key) => {
    if (output.includes(key)) return;
    const defaultIndex = DEFAULT_TOOLBAR_ITEMS.indexOf(key);
    const nextDefault = DEFAULT_TOOLBAR_ITEMS.slice(defaultIndex + 1).find((candidate) => !candidate.startsWith("separator-") && output.includes(candidate));
    const insertAt = nextDefault ? output.indexOf(nextDefault) : output.length;
    output.splice(insertAt >= 0 ? insertAt : output.length, 0, key);
  });
  return normalizeToolbarItems(output);
}

function applyToolbarOrder() {
  if (!elements.topToolbar) return;
  const previousItems = JSON.stringify(preferences.toolbarItems);
  preferences.toolbarItems = normalizeToolbarItems(preferences.toolbarItems);
  if (JSON.stringify(preferences.toolbarItems) !== previousItems) savePreferences();
  const itemMap = new Map(Array.from(elements.topToolbar.querySelectorAll("[data-toolbar-key]")).map((item) => [item.dataset.toolbarKey, item]));
  const visibleKeys = new Set(preferences.toolbarItems.filter((key) => !key.startsWith("separator-")));
  itemMap.forEach((item, key) => {
    item.classList.toggle("toolbar-user-hidden", !visibleKeys.has(key));
  });
  elements.topToolbar.querySelectorAll(".toolbar-separator").forEach((separator) => separator.remove());
  preferences.toolbarItems.forEach((key) => {
    if (key.startsWith("separator-")) {
      const separator = document.createElement("span");
      separator.className = "toolbar-separator";
      separator.dataset.toolbarKey = key;
      separator.title = "Separador";
      elements.topToolbar.append(separator);
      return;
    }

    const item = itemMap.get(key);
    if (item) elements.topToolbar.append(item);
  });
  updateToolbarLockState();
}

function updateToolbarLockState() {
  if (!elements.topToolbar) return;
  const locked = Boolean(preferences.toolbarLocked);
  elements.topToolbar.classList.toggle("toolbar-locked", locked);
  elements.topToolbar.querySelectorAll("[data-toolbar-key]").forEach((item) => {
    item.draggable = !locked;
    if (item.dataset.toolbarKey === "search") {
      item.querySelectorAll("input").forEach((input) => {
        input.draggable = false;
      });
    }
  });

  const lockButton = elements.toolbarContextMenu?.querySelector('[data-toolbar-menu="lock"]');
  if (lockButton) lockButton.textContent = locked ? "Desbloquear barra" : "Bloquear barra";
}

function openToolbarContextMenu(event) {
  const item = event.target.closest("[data-toolbar-key]");
  if (!item || !elements.topToolbar.contains(item) || !elements.toolbarContextMenu) return;

  event.preventDefault();
  toolbarContextTargetKey = item.dataset.toolbarKey || "";
  updateToolbarLockState();

  const removeButton = elements.toolbarContextMenu.querySelector('[data-toolbar-menu="remove"]');
  if (removeButton) {
    removeButton.disabled = toolbarContextTargetKey === "search";
    removeButton.textContent = toolbarContextTargetKey.startsWith("separator-") ? "Remover separador" : "Remover item";
  }

  elements.toolbarContextMenu.hidden = false;
  elements.toolbarContextMenu.style.left = "0px";
  elements.toolbarContextMenu.style.top = "0px";
  const bounds = elements.toolbarContextMenu.getBoundingClientRect();
  const x = Math.min(event.clientX, window.innerWidth - bounds.width - 10);
  const y = Math.min(event.clientY, window.innerHeight - bounds.height - 10);
  elements.toolbarContextMenu.style.left = Math.max(10, x) + "px";
  elements.toolbarContextMenu.style.top = Math.max(10, y) + "px";
}

function closeToolbarContextMenu() {
  if (!elements.toolbarContextMenu) return;
  elements.toolbarContextMenu.hidden = true;
  toolbarContextTargetKey = "";
}

function handleToolbarMenuAction(action) {
  if (!action) return;

  if (action === "remove" && toolbarContextTargetKey && toolbarContextTargetKey !== "search") {
    preferences.toolbarItems = preferences.toolbarItems.filter((key) => key !== toolbarContextTargetKey);
    showToast("Item removido da barra");
  }

  if (action === "separator") {
    const separatorKey = "separator-" + Date.now();
    const index = preferences.toolbarItems.indexOf(toolbarContextTargetKey);
    if (index >= 0) preferences.toolbarItems.splice(index + 1, 0, separatorKey);
    else preferences.toolbarItems.push(separatorKey);
    showToast("Separador adicionado");
  }

  if (action === "lock") {
    preferences.toolbarLocked = !preferences.toolbarLocked;
    showToast(preferences.toolbarLocked ? "Barra bloqueada" : "Barra desbloqueada");
  }

  if (action === "reset") {
    preferences.toolbarItems = DEFAULT_TOOLBAR_ITEMS.slice();
    preferences.toolbarLocked = false;
    showToast("Barra restaurada");
  }

  savePreferences();
  applyToolbarOrder();
  closeToolbarContextMenu();
}

function startToolbarDrag(event) {
  const item = event.target.closest("[data-toolbar-key]");
  if (preferences.toolbarLocked || event.target.closest("input") || !item || !elements.topToolbar.contains(item)) {
    event.preventDefault();
    return;
  }

  draggedToolbarKey = item.dataset.toolbarKey;
  item.classList.add("toolbar-dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedToolbarKey);
}

function handleToolbarDragOver(event) {
  if (preferences.toolbarLocked || !draggedToolbarKey) return;
  const target = event.target.closest("[data-toolbar-key]");
  if (!target || target.dataset.toolbarKey === draggedToolbarKey) return;

  event.preventDefault();
  clearToolbarDropTargets();
  target.classList.add("toolbar-drop-target");
  event.dataTransfer.dropEffect = "move";
}

function dropToolbarItem(event) {
  if (preferences.toolbarLocked || !draggedToolbarKey) return;
  const target = event.target.closest("[data-toolbar-key]");
  if (!target || target.dataset.toolbarKey === draggedToolbarKey) return;

  event.preventDefault();
  const nextItems = preferences.toolbarItems.filter((key) => key !== draggedToolbarKey);
  const targetIndex = nextItems.indexOf(target.dataset.toolbarKey);
  if (targetIndex < 0) return;

  nextItems.splice(targetIndex, 0, draggedToolbarKey);
  preferences.toolbarItems = normalizeToolbarItems(nextItems);
  savePreferences();
  applyToolbarOrder();
  showToast("Barra reorganizada");
}

function clearToolbarDropTargets() {
  elements.topToolbar?.querySelectorAll(".toolbar-drop-target").forEach((item) => item.classList.remove("toolbar-drop-target"));
}

function endToolbarDrag() {
  draggedToolbarKey = "";
  elements.topToolbar?.querySelectorAll(".toolbar-dragging").forEach((item) => item.classList.remove("toolbar-dragging"));
  clearToolbarDropTargets();
}

function renderToolbarSettings() {
  if (!elements.toolbarOrderList) return;
  preferences.toolbarItems = normalizeToolbarItems(preferences.toolbarItems);
  elements.toolbarOrderList.replaceChildren();
  preferences.toolbarItems.forEach((key, index) => {
    const row = document.createElement("article");
    row.className = "toolbar-config-row";
    row.dataset.key = key;
    const label = key.startsWith("separator-") ? "Separador" : TOOLBAR_LABELS[key];
    row.innerHTML = `
      <span class="drag-dot"><svg><use href="#icon-grip"></use></svg></span>
      <strong>${label}</strong>
      <div>
        <button type="button" data-toolbar-action="up" aria-label="Mover para cima">â†‘</button>
        <button type="button" data-toolbar-action="down" aria-label="Mover para baixo">â†“</button>
        ${key.startsWith("separator-") ? '<button type="button" data-toolbar-action="remove" aria-label="Remover">×</button>' : ""}
      </div>
    `;
    row.querySelector('[data-toolbar-action="up"]').disabled = index === 0;
    row.querySelector('[data-toolbar-action="down"]').disabled = index === preferences.toolbarItems.length - 1;
    elements.toolbarOrderList.append(row);
  });
}

function handleToolbarConfigAction(event) {
  const button = event.target.closest("[data-toolbar-action]");
  if (!button) return;
  const row = button.closest(".toolbar-config-row");
  const key = row?.dataset.key;
  const index = preferences.toolbarItems.indexOf(key);
  if (index < 0) return;

  if (button.dataset.toolbarAction === "remove") {
    preferences.toolbarItems.splice(index, 1);
  }
  if (button.dataset.toolbarAction === "up" && index > 0) {
    [preferences.toolbarItems[index - 1], preferences.toolbarItems[index]] = [preferences.toolbarItems[index], preferences.toolbarItems[index - 1]];
  }
  if (button.dataset.toolbarAction === "down" && index < preferences.toolbarItems.length - 1) {
    [preferences.toolbarItems[index + 1], preferences.toolbarItems[index]] = [preferences.toolbarItems[index], preferences.toolbarItems[index + 1]];
  }
  savePreferences();
  applyToolbarOrder();
  renderToolbarSettings();
}

function addToolbarSeparator() {
  preferences.toolbarItems.push(`separator-${Date.now()}`);
  savePreferences();
  applyToolbarOrder();
  renderToolbarSettings();
}

function resetToolbarOrder() {
  preferences.toolbarItems = DEFAULT_TOOLBAR_ITEMS.slice();
  savePreferences();
  applyToolbarOrder();
  renderToolbarSettings();
}

function handleDefaultFolderColorClick(event) {
  const button = event.target.closest("[data-color]");
  if (button) setDefaultFolderColor(button.dataset.color);
}

function applyCustomFont() {
  let style = document.querySelector("#notiCustomFont");
  if (!style) {
    style = document.createElement("style");
    style.id = "notiCustomFont";
    document.head.append(style);
  }

  if (!preferences.fontDataUrl || !preferences.fontFamily) {
    style.textContent = "";
    document.documentElement.style.removeProperty("--font");
    return;
  }

  const family = preferences.fontFamily;
  const format = getFontFormat(preferences.fontFileName);
  style.textContent = `@font-face{font-family:"${family}";src:url("${preferences.fontDataUrl}") format("${format}");font-display:swap;}`;
  document.documentElement.style.setProperty("--font", `"${family}", "SF Pro Text", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`);
}

function getFontFormat(fileName = "") {
  const name = fileName.toLowerCase();
  if (name.endsWith(".woff2")) return "woff2";
  if (name.endsWith(".woff")) return "woff";
  if (name.endsWith(".otf")) return "opentype";
  return "truetype";
}

function sanitizeFontFamily(fileName) {
  return `NotiFont_${String(fileName || "custom").replace(/\.[^.]+$/, "").replace(/[^a-z0-9]+/gi, "_")}`;
}

function setupPhoneCountrySelects() {
  renderCountryOptions(elements.signupCountrySelect, "BR");
  renderCountryOptions(elements.settingsCountrySelect, "BR");
}

function renderCountryOptions(select, activeCode = "BR") {
  if (!select) return;
  select.replaceChildren();
  PHONE_COUNTRIES.forEach((country) => {
    const option = document.createElement("option");
    option.value = country.code;
    option.textContent = country.flag + " " + country.dial;
    option.title = country.name + " " + country.dial;
    select.append(option);
  });
  select.value = getPhoneCountry(activeCode).code;
}

function getPhoneCountry(code) {
  return PHONE_COUNTRIES.find((country) => country.code === code) || PHONE_COUNTRIES[0];
}

function parsePhoneParts(phone, countryCode = "BR") {
  const value = String(phone || "").trim();
  const compact = value.replace(/s+/g, "");
  const detected = PHONE_COUNTRIES.find((country) => compact.startsWith(country.dial));
  const country = detected || getPhoneCountry(countryCode);
  const number = detected ? compact.slice(country.dial.length) : value;
  return { countryCode: country.code, number: normalizePhoneNumber(number) };
}

function normalizePhoneNumber(value) {
  return String(value || "").replace(/[^d()-s]/g, "").replace(/s+/g, " ").trim();
}

function normalizeAccent(value) {
  const fallback = "#b98500";
  const color = String(value || fallback).trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : fallback;
}

function hexToRgba(hex, alpha) {
  const normalized = normalizeAccent(hex).replace("#", "");
  const value = normalized.length === 3 ? normalized.split("").map((item) => item + item).join("") : normalized;
  const number = parseInt(value, 16);
  const red = (number >> 16) & 255;
  const green = (number >> 8) & 255;
  const blue = number & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function loadUsers() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USER_STORE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((user) => user?.id && user?.email && user?.username)
      .map((user) => {
        const phoneParts = parsePhoneParts(user.phone, user.phoneCountry);
        return {
          id: String(user.id),
          name: typeof user.name === "string" ? user.name : "",
          username: normalizeUsername(user.username),
          email: String(user.email).toLowerCase(),
          phone: phoneParts.number,
          phoneCountry: phoneParts.countryCode,
          password: typeof user.password === "string" ? user.password : "",
          photo: typeof user.photo === "string" ? user.photo : "",
          createdAt: Number.isFinite(user.createdAt) ? user.createdAt : Date.now(),
          updatedAt: Number.isFinite(user.updatedAt) ? user.updatedAt : Date.now(),
        };
      });
  } catch (error) {
    console.warn("Usu\u00e1rios salvos inv\u00e1lidos.", error);
    return [];
  }
}
function saveUsers() {
  localStorage.setItem(USER_STORE_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  return users.find((user) => user.id === currentUserId) || null;
}

function renderAccountButton() {
  const user = getCurrentUser();
  elements.accountLabel.textContent = user ? (user.name.trim().split(" ")[0] || user.username) : "Entrar";
  renderAvatar(elements.accountAvatar, user);
}

function openAccountModal(panel = "login") {
  elements.modalLayer.hidden = false;
  elements.accountModal.hidden = false;
  elements.settingsModal.hidden = true;
  elements.profileEditDialog.hidden = true;
  elements.folderEditDialog.hidden = true;
  document.body.classList.remove("mobile-settings-page");
  elements.closeSettingsModal.innerHTML = "<span>‹</span> Voltar ao aplicativo";
  setActiveAccountPanel(panel);
  closeSidebar();
  updateMobileLayoutState();
  setTimeout(() => {
    const target = panel === "signup" ? elements.signupNameInput : elements.loginIdentifierInput;
    target.focus();
  }, 0);
}

function openProfileAccountEntry(event) {
  event?.preventDefault();
  event?.stopPropagation();
  openAccountModal("login");
}

function setActiveAccountPanel(panel) {
  const isSignup = panel === "signup";
  elements.loginTabButton.classList.toggle("active", !isSignup);
  elements.signupTabButton.classList.toggle("active", isSignup);
  elements.loginForm.hidden = isSignup;
  elements.signupForm.hidden = !isSignup;
  const hint = document.querySelector("#accountModeHint");
  if (hint) hint.textContent = isSignup ? "Crie sua conta local para continuar." : "Entre com sua conta local para continuar.";
  const title = document.querySelector("#accountModalTitle");
  if (title) title.textContent = isSignup ? "Criar conta" : "Entrar no Noti";
}

function closeModals() {
  elements.modalLayer.hidden = true;
  elements.accountModal.hidden = true;
  elements.settingsModal.hidden = true;
  elements.profileEditDialog.hidden = true;
  elements.folderEditDialog.hidden = true;
  document.body.classList.remove("mobile-settings-page");
  elements.closeSettingsModal.innerHTML = "<span>‹</span> Voltar ao aplicativo";
  updateMobileLayoutState();
}

async function handleSignupPhoto() {
  const file = elements.signupPhotoInput.files?.[0];
  elements.signupPhotoInput.value = "";
  if (!file) return;
  if (file.size > MAX_ATTACHMENT_BYTES) {
    showToast(`Foto acima de ${formatFileSize(MAX_ATTACHMENT_BYTES)} ignorada`);
    return;
  }
  currentSignupPhoto = await readFileAsDataUrl(file);
  renderAvatar(elements.signupPhotoPreview, { photo: currentSignupPhoto });
}

function handleSignup(event) {
  event.preventDefault();
  const name = elements.signupNameInput.value.trim();
  const username = normalizeUsername(elements.signupUsernameInput.value);
  const email = elements.signupEmailInput.value.trim().toLowerCase();
  const phone = normalizePhoneNumber(elements.signupPhoneInput.value);
  const phoneCountry = getPhoneCountry(elements.signupCountrySelect.value).code;
  const password = elements.signupPasswordInput.value;

  if (!name || username.length < 2 || !email || password.length < 4) {
    showToast("Preencha nome, @usuário, e-mail e senha");
    return;
  }
  if (users.some((user) => user.email === email || user.username.toLowerCase() === username.toLowerCase())) {
    showToast("E-mail ou usuário já cadastrado");
    return;
  }

  const now = Date.now();
  const user = { id: cryptoId(), name, username, email, phone, phoneCountry, password, photo: currentSignupPhoto, createdAt: now, updatedAt: now };
  users.push(user);
  currentUserId = user.id;
  localStorage.setItem(CURRENT_USER_KEY, currentUserId);
  saveUsers();
  elements.signupForm.reset();
  elements.signupUsernameInput.value = "@";
  elements.signupCountrySelect.value = "BR";
  currentSignupPhoto = "";
  renderAvatar(elements.signupPhotoPreview, null);
  renderAccountButton();
  closeModals();
  showToast("Conta local criada");
}

function handleLogin(event) {
  event.preventDefault();
  const identifier = elements.loginIdentifierInput.value.trim().toLowerCase();
  const password = elements.loginPasswordInput.value;
  const user = users.find((candidate) => {
    return candidate.email === identifier || candidate.username.toLowerCase() === normalizeUsername(identifier).toLowerCase();
  });

  if (!user || user.password !== password) {
    showToast("Login ou senha incorretos");
    return;
  }

  currentUserId = user.id;
  localStorage.setItem(CURRENT_USER_KEY, currentUserId);
  elements.loginForm.reset();
  renderAccountButton();
  closeModals();
  showToast("Conta conectada");
}

function logoutUser() {
  currentUserId = "";
  localStorage.removeItem(CURRENT_USER_KEY);
  pendingProfilePhoto = "";
  renderAccountButton();
  renderSettings();
  showToast("Você saiu da conta");
}

function openSettingsModal(tab = "profile") {
  if (isMobileLayout()) mobileSettingsReturnScreen = mobileScreen === "editor" ? "editor" : mobileScreen === "list" ? "list" : "folders";
  pendingProfilePhoto = "";
  elements.modalLayer.hidden = false;
  elements.settingsModal.hidden = false;
  elements.accountModal.hidden = true;
  document.body.classList.toggle("mobile-settings-page", isMobileLayout());
  elements.closeSettingsModal.innerHTML = isMobileLayout()
    ? `<span>‹</span> ${mobileSettingsReturnScreen === "list" ? getViewTitle() : mobileSettingsReturnScreen === "editor" ? "Nota" : "Pastas"}`
    : "<span>‹</span> Voltar ao aplicativo";
  setActiveSettingsTab(tab);
  renderSettings();
  closeSidebar();
}

function setActiveSettingsTab(tab) {
  const nextTab = ["profile", "appearance", "folders", "archived", "recovery"].includes(tab) ? tab : "profile";
  elements.settingsTabs.forEach((button) => button.classList.toggle("active", button.dataset.settingsTab === nextTab));
  elements.settingsPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.settingsPanel === nextTab));
}

function renderSettingsIfOpen() {
  if (!elements.modalLayer.hidden && !elements.settingsModal.hidden) renderSettings();
}

function renderSettings() {
  renderSettingsProfile();
  renderStats();
  renderAppearanceControls();
  renderArchivedNotes();
}

function renderSettingsProfile() {
  const user = getCurrentUser();
  renderAvatar(elements.settingsProfilePhoto, user ? { ...user, photo: pendingProfilePhoto || user.photo } : null);
  renderAvatar(elements.settingsHeaderAvatar, user ? { ...user, photo: pendingProfilePhoto || user.photo } : null);
  elements.profileDisplayName.textContent = user?.name || "Sem conta";
  elements.profileDisplayUsername.textContent = user ? user.username : "Entre para ver seu perfil";
  elements.profileStatus.textContent = user ? "Perfil local salvo neste navegador." : "Entre para editar seu perfil local.";
  elements.profileLoginButton.hidden = Boolean(user);
  elements.editProfileButton.hidden = !user;
  elements.logoutButton.hidden = !user;
}

function openProfileEditDialog() {
  const user = getCurrentUser();
  if (!user) {
    openAccountModal("login");
    return;
  }
  pendingProfilePhoto = "";
  elements.settingsNameInput.value = user.name || "";
  elements.settingsUsernameInput.value = user.username || "@";
  elements.settingsEmailInput.value = user.email || "";
  const phoneParts = parsePhoneParts(user.phone, user.phoneCountry);
  elements.settingsCountrySelect.value = phoneParts.countryCode;
  elements.settingsPhoneInput.value = phoneParts.number;
  renderAvatar(elements.settingsHeaderAvatar, user);
  elements.profileEditDialog.hidden = false;
}

function closeProfileEditDialog() {
  pendingProfilePhoto = "";
  elements.profileEditDialog.hidden = true;
  renderSettingsProfile();
}

async function handleSettingsPhoto() {
  const file = elements.settingsPhotoInput.files?.[0];
  elements.settingsPhotoInput.value = "";
  if (!file) return;
  if (file.size > MAX_ATTACHMENT_BYTES) {
    showToast(`Foto acima de ${formatFileSize(MAX_ATTACHMENT_BYTES)} ignorada`);
    return;
  }
  pendingProfilePhoto = await readFileAsDataUrl(file);
  renderAvatar(elements.settingsHeaderAvatar, { photo: pendingProfilePhoto });
  renderAvatar(elements.settingsProfilePhoto, { photo: pendingProfilePhoto });
}

function saveProfileSettings() {
  const user = getCurrentUser();
  if (!user) {
    openAccountModal("login");
    return;
  }

  const name = elements.settingsNameInput.value.trim();
  const username = normalizeUsername(elements.settingsUsernameInput.value);
  const email = elements.settingsEmailInput.value.trim().toLowerCase();
  const phone = normalizePhoneNumber(elements.settingsPhoneInput.value);
  const phoneCountry = getPhoneCountry(elements.settingsCountrySelect.value).code;

  if (!name || username.length < 2 || !email) {
    showToast("Preencha nome, @usuário e e-mail");
    return;
  }
  if (users.some((candidate) => candidate.id !== user.id && (candidate.email === email || candidate.username.toLowerCase() === username.toLowerCase()))) {
    showToast("E-mail ou usuário já está em uso");
    return;
  }

  user.name = name;
  user.username = username;
  user.email = email;
  user.phone = phone;
  user.phoneCountry = phoneCountry;
  user.photo = pendingProfilePhoto || user.photo;
  user.updatedAt = Date.now();
  pendingProfilePhoto = "";
  saveUsers();
  renderAccountButton();
  closeProfileEditDialog();
  renderSettings();
  showToast("Perfil atualizado");
}

function keepUsernamePrefix(input) {
  const cursorAtEnd = input.selectionStart === input.value.length;
  input.value = normalizeUsername(input.value);
  if (cursorAtEnd) input.setSelectionRange(input.value.length, input.value.length);
}

function normalizeUsernameInput(input) {
  input.value = normalizeUsername(input.value);
}

function normalizeUsername(value) {
  const clean = String(value || "").trim().replace(/\s+/g, "").replace(/^@+/, "");
  return `@${clean}`;
}

function renderAvatar(target, user) {
  target.replaceChildren();
  if (user?.photo) {
    const image = document.createElement("img");
    image.src = user.photo;
    image.alt = "";
    target.append(image);
    return;
  }
  target.innerHTML = `<svg><use href="#icon-user"></use></svg>`;
}

function renderStats() {
  const stats = getAppStats();
  const cards = [
    ["Objetivos concluídos", stats.completedThisYear],
    ["Total em compras", stats.shoppingTotalText],
    ["Compras marcadas", stats.boughtItemsCount],
    ["Listas de compras", stats.shoppingListCount],
    ["Notas ativas", stats.activeNotes],
    ["Arquivadas", stats.archivedNotes],
  ];

  if (!elements.profileStatsStrip) return;
  elements.profileStatsStrip.replaceChildren();
  cards.forEach(([label, value]) => {
    const item = document.createElement("span");
    item.innerHTML = "<strong></strong><small></small>";
    item.querySelector("strong").textContent = String(value);
    item.querySelector("small").textContent = label;
    elements.profileStatsStrip.append(item);
  });
}

function renderActivityGrid() {
  elements.activityGrid.replaceChildren();
  const now = new Date();
  const year = now.getFullYear();
  const months = Array.from({ length: 12 }, () => 0);
  state.notes.filter((note) => !note.trashed).forEach((note) => {
    const date = new Date(note.updatedAt);
    if (date.getFullYear() !== year) return;
    months[date.getMonth()] += note.items.filter((item) => item.done).length + note.shoppingItems.filter((item) => item.done).length + 1;
  });
  for (let index = 0; index < 156; index += 1) {
    const cell = document.createElement("span");
    const month = Math.min(11, Math.floor(index / 13));
    const intensity = Math.min(4, months[month]);
    cell.dataset.level = String(intensity);
    elements.activityGrid.append(cell);
  }
}

function getAppStats() {
  const currentYear = new Date().getFullYear();
  const active = state.notes.filter((note) => !note.trashed);
  const visible = active.filter((note) => !note.archived);
  const totals = new Map();
  let completedThisYear = 0;
  let boughtItemsCount = 0;

  active.forEach((note) => {
    const noteYear = new Date(note.updatedAt).getFullYear();
    if (noteYear === currentYear) {
      completedThisYear += note.items.filter((item) => item.done).length;
      completedThisYear += note.shoppingItems.filter((item) => item.done).length;
      if (note.type === "goal" && getGoalMetrics(note).percent >= 100) completedThisYear += 1;
    }
    if (note.type === "shopping") {
      const currency = note.currency || "BRL";
      totals.set(currency, (totals.get(currency) || 0) + getShoppingTotal(note));
      boughtItemsCount += note.shoppingItems.filter((item) => item.done).length;
    }
  });

  return {
    completedThisYear,
    shoppingTotalText: formatCurrencyTotals(totals),
    boughtItemsCount,
    shoppingListCount: active.filter((note) => note.type === "shopping" && note.shoppingItems.length).length,
    activeNotes: visible.length,
    checklists: visible.filter((note) => note.type === "checklist").length,
    goals: visible.filter((note) => note.type === "goal").length,
    pinnedNotes: visible.filter((note) => note.pinned).length,
    attachments: active.reduce((total, note) => total + note.attachments.length + note.items.filter((item) => item.image).length, 0),
    archivedNotes: state.notes.filter((note) => note.archived && !note.trashed).length,
  };
}

function formatCurrencyTotals(totals) {
  const entries = Array.from(totals.entries()).filter(([, value]) => value > 0);
  if (!entries.length) return formatCurrency(0, "BRL");
  return entries.map(([currency, value]) => formatCurrency(value, currency)).join(" | ");
}

function renderArchivedNotes() {
  const archived = state.notes.filter((note) => note.archived && !note.trashed).sort((a, b) => b.updatedAt - a.updatedAt);
  elements.archivedNotesList.replaceChildren();

  if (!archived.length) {
    const empty = document.createElement("div");
    empty.className = "archived-empty";
    empty.innerHTML = `<strong>Nenhuma nota arquivada</strong><span>Quando você arquivar uma nota, ela aparece aqui.</span>`;
    elements.archivedNotesList.append(empty);
    return;
  }

  archived.forEach((note) => {
    const card = document.createElement("article");
    card.className = "archived-card";
    card.innerHTML = `
      <div>
        <strong></strong>
        <span></span>
      </div>
      <div class="archived-actions">
        <button class="secondary-action" type="button">Restaurar</button>
        <button class="icon-button danger" type="button" aria-label="Mover para lixeira"><svg><use href="#icon-trash"></use></svg></button>
      </div>
    `;
    card.querySelector("strong").textContent = note.title.trim() || "Sem título";
    card.querySelector("span").textContent = `${getNoteKindLabel(note)} | ${formatNoteDate(note.updatedAt)}`;
    card.querySelector(".secondary-action").addEventListener("click", () => unarchiveNote(note.id));
    card.querySelector(".danger").addEventListener("click", () => trashArchivedNote(note.id));
    elements.archivedNotesList.append(card);
  });
}

function downloadNotesBackup() {
  const payload = {
    type: BACKUP_TYPE,
    version: BACKUP_VERSION,
    app: "Noti",
    exportedAt: new Date().toISOString(),
    summary: {
      notes: state.notes.length,
      folders: state.folders.length,
      attachments: state.notes.reduce((total, note) => {
        const checklistImages = note.items.filter((item) => item.image?.dataUrl).length;
        const shoppingImages = note.shoppingItems.filter((item) => item.image?.dataUrl).length;
        return total + note.attachments.length + checklistImages + shoppingImages;
      }, 0),
      drawings: state.notes.reduce((total, note) => total + note.pageDrawings.length + note.drawingBlocks.length, 0),
    },
    state: clonePlainData(state),
    preferences: clonePlainData(preferences),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `noti-backup-${formatBackupDate(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  showToast("Backup das notas baixado");
}

async function handleBackupRestore() {
  const file = elements.restoreBackupInput?.files?.[0];
  if (elements.restoreBackupInput) elements.restoreBackupInput.value = "";
  if (!file) return;

  try {
    const parsed = JSON.parse(await readFileAsText(file));
    const nextState = extractBackupState(parsed);
    const nextPreferences = extractBackupPreferences(parsed);
    const merge = buildBackupMerge(nextState);
    const shouldRestore = confirm(
      `Recuperar este backup?\n\n${merge.stats.added} ${merge.stats.added === 1 ? "nota nova será adicionada" : "notas novas serão adicionadas"}.\n${merge.stats.replaced} ${merge.stats.replaced === 1 ? "nota com mesmo nome será substituída" : "notas com mesmo nome serão substituídas"}.\n\nAs outras notas deste navegador serão mantidas.`
    );
    if (!shouldRestore) return;

    restoreBackupData(merge.state, nextPreferences);
    showToast(`Backup recuperado: ${merge.stats.added} adicionadas, ${merge.stats.replaced} substituídas`);
  } catch (error) {
    console.warn("Backup inválido.", error);
    showToast("Arquivo de backup inválido");
  }
}

function extractBackupState(payload) {
  const candidate = payload?.type === BACKUP_TYPE ? payload.state : payload?.state || payload;
  if (!candidate || !Array.isArray(candidate.folders) || !Array.isArray(candidate.notes)) {
    throw new Error("Backup sem notas ou pastas");
  }
  return normalizeState(candidate);
}

function extractBackupPreferences(payload) {
  if (!payload || payload.type !== BACKUP_TYPE || !payload.preferences || typeof payload.preferences !== "object") {
    return null;
  }
  return normalizePreferencesData(payload.preferences, preferences);
}

function buildBackupMerge(nextState) {
  const mergedFolders = clonePlainData(state.folders);
  const mergedNotes = clonePlainData(state.notes);
  const folderIdMap = new Map();
  const folderByName = new Map();
  const usedFolderIds = new Set(mergedFolders.map((folder) => folder.id));
  let nextFolderOrder = Math.max(-1, ...mergedFolders.map((folder) => Number.isFinite(folder.order) ? folder.order : -1)) + 1;
  let foldersAdded = 0;
  let foldersUpdated = 0;

  mergedFolders.forEach((folder) => {
    const key = getBackupNameKey(folder.name);
    if (key && !folderByName.has(key)) folderByName.set(key, folder);
  });

  nextState.folders.forEach((folder) => {
    const key = getBackupNameKey(folder.name);
    const existing = key ? folderByName.get(key) : null;
    if (existing) {
      existing.color = folder.color || existing.color;
      folderIdMap.set(folder.id, existing.id);
      foldersUpdated += 1;
      return;
    }

    const nextFolder = {
      ...clonePlainData(folder),
      id: ensureUniqueBackupId(folder.id, usedFolderIds),
      order: nextFolderOrder,
    };
    nextFolderOrder += 1;
    folderIdMap.set(folder.id, nextFolder.id);
    mergedFolders.push(nextFolder);
    if (key) folderByName.set(key, nextFolder);
    foldersAdded += 1;
  });

  const noteIndexByName = new Map();
  const usedNoteIds = new Set(mergedNotes.map((note) => note.id));
  let added = 0;
  let replaced = 0;

  mergedNotes.forEach((note, index) => {
    const key = getBackupNoteKey(note);
    if (key && !noteIndexByName.has(key)) noteIndexByName.set(key, index);
  });

  nextState.notes.forEach((note) => {
    const nextNote = clonePlainData(note);
    nextNote.folderId = mapBackupFolderId(note.folderId, folderIdMap, usedFolderIds);
    const key = getBackupNoteKey(nextNote);

    if (key && noteIndexByName.has(key)) {
      const index = noteIndexByName.get(key);
      nextNote.id = mergedNotes[index].id;
      mergedNotes[index] = nextNote;
      replaced += 1;
      return;
    }

    nextNote.id = ensureUniqueBackupId(nextNote.id, usedNoteIds);
    mergedNotes.push(nextNote);
    if (key) noteIndexByName.set(key, mergedNotes.length - 1);
    added += 1;
  });

  return {
    state: normalizeState({ folders: mergedFolders, notes: mergedNotes }),
    stats: { added, replaced, foldersAdded, foldersUpdated },
  };
}

function getBackupNoteKey(note) {
  return getBackupNameKey(note?.title);
}

function getBackupNameKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

function ensureUniqueBackupId(id, usedIds) {
  let nextId = String(id || "").trim();
  while (!nextId || usedIds.has(nextId)) nextId = cryptoId();
  usedIds.add(nextId);
  return nextId;
}

function mapBackupFolderId(folderId, folderIdMap, usedFolderIds) {
  const currentId = String(folderId || "");
  if (!currentId) return "";
  if (folderIdMap.has(currentId)) return folderIdMap.get(currentId);
  return usedFolderIds.has(currentId) ? currentId : "";
}

function restoreBackupData(nextState, nextPreferences = null) {
  const previousFolders = state.folders;
  const previousNotes = state.notes;
  const previousPreferences = preferences;

  state.folders = nextState.folders;
  state.notes = nextState.notes;
  if (nextPreferences) preferences = nextPreferences;
  currentView = "all";
  selectedNoteId = state.notes.find((note) => !note.trashed && !note.archived)?.id ?? state.notes.find((note) => !note.trashed)?.id ?? state.notes[0]?.id ?? null;
  draggedNoteId = null;
  draggedNoteBlockIds = [];
  draggedChecklistItemId = "";
  draggedShoppingItemId = "";
  draggedDrawingBlockId = "";
  drawingRedoStacks.clear();

  try {
    saveState();
    if (nextPreferences) {
      savePreferences();
      localStorage.setItem(THEME_KEY, preferences.theme);
      applyTheme(preferences.theme);
      applyPreferences();
    }
  } catch (error) {
    state.folders = previousFolders;
    state.notes = previousNotes;
    preferences = previousPreferences;
    throw error;
  }

  render();
}

function clonePlainData(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatBackupDate(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

function unarchiveNote(noteId) {
  const note = state.notes.find((item) => item.id === noteId);
  if (!note) return;
  note.archived = false;
  note.trashed = false;
  note.updatedAt = Date.now();
  currentView = "all";
  selectedNoteId = note.id;
  saveState();
  render();
  showToast("Nota restaurada do arquivo");
}

function trashArchivedNote(noteId) {
  const note = state.notes.find((item) => item.id === noteId);
  if (!note) return;
  note.archived = false;
  note.trashed = true;
  note.pinned = false;
  note.updatedAt = Date.now();
  saveState();
  render();
  showToast("Nota movida para a lixeira");
}
function openCreateTypeModal() {
  elements.createTypeLayer.hidden = false;
}

function closeCreateTypeModal() {
  if (elements.createTypeLayer) elements.createTypeLayer.hidden = true;
}

function handleCreateTypeLayerClick(event) {
  const typeButton = event.target.closest("[data-create-type]");
  if (typeButton) {
    createNote(typeButton.dataset.createType);
    closeCreateTypeModal();
    return;
  }

  if (event.target === elements.createTypeLayer || event.target.closest("[data-create-close]")) {
    closeCreateTypeModal();
  }
}

function toggleSidebarCollapsed() {
  preferences.sidebarCollapsed = !preferences.sidebarCollapsed;
  savePreferences();
  applySidebarCollapsed();
}

function applySidebarCollapsed() {
  const collapsed = Boolean(preferences.sidebarCollapsed);
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  if (elements.sidebarCollapseButton) {
    elements.sidebarCollapseButton.setAttribute("aria-pressed", String(collapsed));
    elements.sidebarCollapseButton.setAttribute("aria-label", collapsed ? "Expandir barra lateral" : "Compactar barra lateral");
  }
  updateBrandAssets();
  closeCreateTypeModal();
}

function openSidebar() {
  if (isMobileLayout()) {
    showMobileScreen("folders");
    return;
  }
  elements.sidebar.classList.add("open");
  elements.sidebarScrim.classList.add("visible");
}

function closeSidebar() {
  if (isMobileLayout()) {
    elements.sidebar.classList.remove("open");
    elements.sidebarScrim.classList.remove("visible");
    return;
  }
  elements.sidebar.classList.remove("open");
  elements.sidebarScrim.classList.remove("visible");
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("visible");
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, 2200);
}

function cryptoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function formatRelativeTime(timestamp) {
  const delta = Date.now() - timestamp;
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (delta < minute) return "agora";
  if (delta < hour) {
    const minutes = Math.floor(delta / minute);
    return `há ${minutes} min`;
  }
  if (delta < day) {
    const hours = Math.floor(delta / hour);
    return `há ${hours} h`;
  }
  if (delta < day * 7) {
    const days = Math.floor(delta / day);
    return `há ${days} d`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(timestamp);
}

function getDateGroup(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 1000 * 60 * 60 * 24;

  if (timestamp >= startToday) return "Hoje";
  if (timestamp >= startYesterday) return "Ontem";

  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  }).format(date);
}

function formatNoteDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: sameYear ? undefined : "2-digit",
  }).format(date);
}

function formatFullDateTime(timestamp) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(file);
  });
}

















































