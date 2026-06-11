import { useEffect, useMemo, useRef, useState } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  Camera,
  CheckSquare,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FolderOpen,
  Image as ImageIcon,
  ListChecks,
  LockKeyhole,
  LogOut,
  Monitor,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  User,
  X
} from 'lucide-react';
import {
  completeCurrentProfile,
  exchangeOAuthSessionFromUrl,
  INITIAL_ADMIN_EMAIL,
  getCurrentUser,
  linkSocialIdentity,
  loadAdminUsers,
  resolveAuthGateState,
  revokeDeviceByAdmin,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  startSocialSignIn,
  updateAccountStatus,
  updateSubscriptionByAdmin,
  updateUserRole
} from './authService';
import type {
  AccountStatus,
  AdminUserRow,
  AuthGateState,
  ProfileCompletionInput,
  SocialAuthProvider,
  SubscriptionStatus,
  UserRole
} from './shared/authTypes';
import type {
  BoardField,
  BoardLayoutMode,
  BoardPosition,
  BoardSettings,
  BoardTextColor,
  DateTimeMap,
  DateTimeValue,
  HorizontalAlign,
  PhotoHighlight,
  PhotoItem,
  ProcessImagesPayload,
  TimeMode,
  TimeOptions
} from './shared/types';
import { isSupabaseConfigured, supabase } from './supabaseClient';
import {
  DEFAULT_BOARD_WIDTH_RATIO,
  DEFAULT_LABEL_COLUMN_WIDTH_RATIO,
  DEFAULT_VALUE_COLUMN_WIDTH_RATIO,
  MAX_BOARD_WIDTH_RATIO,
  MAX_LABEL_COLUMN_WIDTH_RATIO,
  MAX_VALUE_COLUMN_WIDTH_RATIO,
  MIN_BOARD_WIDTH_RATIO,
  MIN_LABEL_COLUMN_WIDTH_RATIO,
  MIN_VALUE_COLUMN_WIDTH_RATIO,
  boardSizeToWidthRatio,
  clampBoardWidthRatio,
  widthRatioToBoardSize
} from './shared/boardConstants';
import { buildBoardSvg, calculateBoardPosition } from './shared/boardRenderer';
import { resolveHighlightCircle } from './shared/highlightRenderer';
import { calculateContainedSize } from './shared/previewFit';
import type { UpdateStatusPayload } from './electron-api';

type Screen = 'help' | 'basic' | 'advanced' | 'output' | 'commonSettings' | 'contact' | 'admin';
type WorkspaceScreen = 'basic' | 'advanced' | 'output';
type StatusKind = 'info' | 'success' | 'error';
type AuthMode = 'signin' | 'signup';
type StateAction<T> = T | ((current: T) => T);
type CommonOutputSettings = Pick<
  BoardSettings,
  'jpgQuality' | 'outputMaxLongEdge' | 'outputGrayscale' | 'openFolderAfterProcessing' | 'createPdf' | 'pdfTitle'
>;

interface BoardWorkspaceState {
  photos: PhotoItem[];
  selectedPhotoPath: string;
  saveDir: string;
  fields: BoardField[];
  selectedFieldId: string;
  settings: BoardSettings;
  timeOptions: TimeOptions;
  exifMap: DateTimeMap;
  previewDataUrl: string;
  previewRevision: number;
}

interface StatusMessage {
  kind: StatusKind;
  text: string;
}

function isWorkspaceScreen(screen: Screen): screen is WorkspaceScreen {
  return screen === 'basic' || screen === 'advanced' || screen === 'output';
}

function resolveStateAction<T>(current: T, action: StateAction<T>) {
  return typeof action === 'function' ? (action as (current: T) => T)(current) : action;
}

function createDefaultFields(): BoardField[] {
  return [
    { id: crypto.randomUUID(), label: '공사명', value: '' },
    { id: crypto.randomUUID(), label: '공종', value: '' },
    { id: crypto.randomUUID(), label: '위치', value: '' },
    { id: crypto.randomUUID(), label: '내용', value: '' },
    { id: crypto.randomUUID(), label: '날짜', value: '' },
    { id: crypto.randomUUID(), label: '촬영시간', value: '' }
  ];
}

const defaultFields: BoardField[] = createDefaultFields();

const defaultSettings: BoardSettings = {
  boardLayoutMode: 'table',
  position: 'bottom-right',
  widthRatio: DEFAULT_BOARD_WIDTH_RATIO,
  margin: 0,
  boardSize: widthRatioToBoardSize(DEFAULT_BOARD_WIDTH_RATIO),
  labelColumnWidthRatio: DEFAULT_LABEL_COLUMN_WIDTH_RATIO,
  valueColumnWidthRatio: DEFAULT_VALUE_COLUMN_WIDTH_RATIO,
  fontFamily: 'Malgun Gothic Semilight',
  fontSize: 16,
  itemAlign: 'center',
  contentAlign: 'left',
  fontWeight: 'bold',
  rowHeight: 70,
  borderWeight: 'bold',
  jpgQuality: 92,
  boardBackgroundOpacity: 100,
  labelTextColor: 'black',
  valueTextColor: 'black',
  outputMaxLongEdge: 0,
  outputGrayscale: false,
  openFolderAfterProcessing: false,
  createPdf: true,
  pdfTitle: '사진대지'
};

const defaultTimeOptions: TimeOptions = {
  mode: 'manual',
  sequenceStartDate: '',
  sequenceStartTime: '',
  sequenceIntervalMinutes: 60,
  sheetMap: {}
};

function createWorkspaceState(): BoardWorkspaceState {
  const fields = createDefaultFields();
  return {
    photos: [],
    selectedPhotoPath: '',
    saveDir: '',
    fields,
    selectedFieldId: fields[0]?.id ?? '',
    settings: { ...defaultSettings },
    timeOptions: { ...defaultTimeOptions, sheetMap: {} },
    exifMap: {},
    previewDataUrl: '',
    previewRevision: 0
  };
}

function createWorkspaceMap(): Record<WorkspaceScreen, BoardWorkspaceState> {
  return {
    basic: createWorkspaceState(),
    advanced: createWorkspaceState(),
    output: createWorkspaceState()
  };
}

function createCommonOutputSettings(): CommonOutputSettings {
  return {
    jpgQuality: defaultSettings.jpgQuality,
    outputMaxLongEdge: defaultSettings.outputMaxLongEdge,
    outputGrayscale: defaultSettings.outputGrayscale,
    openFolderAfterProcessing: defaultSettings.openFolderAfterProcessing,
    createPdf: defaultSettings.createPdf,
    pdfTitle: defaultSettings.pdfTitle
  };
}

const positionLabels: Record<BoardPosition, string> = {
  'top-left': '좌상단',
  'top-right': '우상단',
  'bottom-left': '좌하단',
  'bottom-right': '우하단'
};

const boardTextColorOptions: Array<[BoardTextColor, string]> = [
  ['black', '검정'],
  ['blue', '파랑'],
  ['red', '빨강'],
  ['green', '녹색']
];

const roleOptions: Array<[UserRole, string]> = [
  ['user', '일반'],
  ['admin', '관리자']
];

const accountStatusOptions: Array<[AccountStatus, string]> = [
  ['active', '사용'],
  ['suspended', '정지']
];

const subscriptionStatusOptions: Array<[SubscriptionStatus, string]> = [
  ['trial', '체험'],
  ['active', '활성'],
  ['manual_active', '수동활성'],
  ['past_due', '결제지연'],
  ['canceled', '해지'],
  ['suspended', '정지']
];

const defaultHighlight: PhotoHighlight = {
  enabled: true,
  xRatio: 0.5,
  yRatio: 0.5,
  radiusRatio: 0.2,
  outsideGrayscale: true
};

const assetBaseUrl = import.meta.env.BASE_URL;
const authSessionMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const authSessionStartedAtKey = 'epyeonhan-auth-started-at';
const oauthRedirectUrl = 'epyeonhan-board://auth/callback';
const socialAuthProviders: Array<{ id: SocialAuthProvider; label: string; badge: string }> = [
  { id: 'google', label: 'Google로 계속하기', badge: 'G' },
  { id: 'kakao', label: '카카오로 계속하기', badge: 'K' },
  { id: 'naver', label: '네이버로 계속하기', badge: 'N' }
];
const visibleSocialAuthProviders = socialAuthProviders.filter((provider) => provider.id === 'google');

export default function App() {
  const [authState, setAuthState] = useState<AuthGateState>({
    status: isSupabaseConfigured ? 'loading' : 'config_missing'
  });
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [authForm, setAuthForm] = useState({ email: '', password: '', displayName: '', company: '' });
  const [authPasswordVisible, setAuthPasswordVisible] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [oauthBusyProvider, setOauthBusyProvider] = useState<SocialAuthProvider | null>(null);
  const [profileCompletionForm, setProfileCompletionForm] = useState<ProfileCompletionInput>({
    company: '',
    displayName: ''
  });
  const [adminRows, setAdminRows] = useState<AdminUserRow[]>([]);
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [activeScreen, setActiveScreen] = useState<Screen>('help');
  const [workspaces, setWorkspaces] = useState<Record<WorkspaceScreen, BoardWorkspaceState>>(() => createWorkspaceMap());
  const [commonOutputSettings, setCommonOutputSettings] = useState<CommonOutputSettings>(() => createCommonOutputSettings());
  const [activeAdvancedSettingsTab, setActiveAdvancedSettingsTab] = useState<'datetime' | 'board'>('datetime');
  const [activeAdvancedBoardTab, setActiveAdvancedBoardTab] = useState<'layout' | 'typography'>('layout');
  const [activeOutputSettingsTab, setActiveOutputSettingsTab] = useState<'fields' | 'layout' | 'typography' | 'highlight'>('fields');
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragTargetActive, setIsDragTargetActive] = useState(false);
  const [showPhotoList, setShowPhotoList] = useState(false);
  const [showLargePreview, setShowLargePreview] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatusPayload | null>(null);

  const activeWorkspaceKey: WorkspaceScreen = isWorkspaceScreen(activeScreen) ? activeScreen : 'basic';
  const workspace = workspaces[activeWorkspaceKey];
  const {
    photos,
    selectedPhotoPath,
    saveDir,
    fields,
    selectedFieldId,
    settings,
    timeOptions,
    exifMap,
    previewDataUrl,
    previewRevision
  } = workspace;

  const selectedPhoto = photos.find((photo) => photo.path === selectedPhotoPath);
  const selectedHighlight = selectedPhoto?.highlight;
  const selectedIndex = selectedPhoto ? photos.findIndex((photo) => photo.path === selectedPhoto.path) : -1;
  const isAdmin = authState.status === 'ready' && authState.profile?.role === 'admin';

  const previewFields = useMemo(
    () => applyTimeMode(fields, selectedPhoto, selectedIndex, timeOptions, exifMap),
    [fields, selectedPhoto, selectedIndex, timeOptions, exifMap]
  );
  const livePreviewSignature = useMemo(
    () =>
      JSON.stringify({
        photoPath: selectedPhotoPath,
        fields: previewFields.map((field) => ({ id: field.id, label: field.label, value: field.value })),
        settings: {
          boardLayoutMode: settings.boardLayoutMode,
          position: settings.position,
          widthRatio: settings.widthRatio,
          boardSize: settings.boardSize,
          labelColumnWidthRatio: settings.labelColumnWidthRatio,
          valueColumnWidthRatio: settings.valueColumnWidthRatio,
          fontFamily: settings.fontFamily,
          fontSize: settings.fontSize,
          itemAlign: settings.itemAlign,
          contentAlign: settings.contentAlign,
          fontWeight: settings.fontWeight,
          rowHeight: settings.rowHeight,
          borderWeight: settings.borderWeight,
          boardBackgroundOpacity: settings.boardBackgroundOpacity,
          labelTextColor: settings.labelTextColor,
          valueTextColor: settings.valueTextColor,
          outputGrayscale: settings.outputGrayscale
        },
        highlight: selectedPhoto?.highlight ?? null
      }),
    [previewFields, selectedPhotoPath, selectedPhoto?.highlight, settings]
  );

  function updateWorkspaceFor(key: WorkspaceScreen, updater: (current: BoardWorkspaceState) => BoardWorkspaceState) {
    setWorkspaces((current) => ({ ...current, [key]: updater(current[key]) }));
  }

  function updateActiveWorkspace(updater: (current: BoardWorkspaceState) => BoardWorkspaceState) {
    updateWorkspaceFor(activeWorkspaceKey, updater);
  }

  function setPhotos(action: StateAction<PhotoItem[]>) {
    updateActiveWorkspace((current) => ({ ...current, photos: resolveStateAction(current.photos, action) }));
  }

  function setSelectedPhotoPath(value: string) {
    updateActiveWorkspace((current) => ({ ...current, selectedPhotoPath: value }));
  }

  function setSaveDir(value: string) {
    updateActiveWorkspace((current) => ({ ...current, saveDir: value }));
  }

  function setFields(action: StateAction<BoardField[]>) {
    updateActiveWorkspace((current) => ({ ...current, fields: resolveStateAction(current.fields, action) }));
  }

  function setSelectedFieldId(value: string) {
    updateActiveWorkspace((current) => ({ ...current, selectedFieldId: value }));
  }

  function setSettings(action: StateAction<BoardSettings>) {
    updateActiveWorkspace((current) => ({ ...current, settings: resolveStateAction(current.settings, action) }));
  }

  function setTimeOptions(action: StateAction<TimeOptions>) {
    updateActiveWorkspace((current) => ({ ...current, timeOptions: resolveStateAction(current.timeOptions, action) }));
  }

  function setPreviewRevision(action: StateAction<number>) {
    updateActiveWorkspace((current) => ({ ...current, previewRevision: resolveStateAction(current.previewRevision, action) }));
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthState({
        status: 'config_missing',
        message: 'Supabase URL과 Anon Key를 .env에 설정하면 로그인을 사용할 수 있습니다.'
      });
      return;
    }

    let canceled = false;

    async function bootstrapAuth() {
      try {
        const user = await getCurrentUser();
        if (!user) {
          if (!canceled) setAuthState({ status: 'unauthenticated' });
          return;
        }
        await loadAuthForUser(user, canceled);
      } catch {
        if (!canceled) setAuthState({ status: 'unauthenticated' });
      }
    }

    const authSubscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (canceled) return;
      if (!session?.user) {
        window.localStorage.removeItem(authSessionStartedAtKey);
        setAuthState({ status: 'unauthenticated' });
        return;
      }
      void loadAuthForUser(session.user, canceled);
    });

    void bootstrapAuth();

    return () => {
      canceled = true;
      authSubscription.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const nativeBridge = getNativeBridge();
    const unsubscribe = nativeBridge?.onOAuthCallback?.((url) => {
      void handleOAuthCallback(url);
    });

    if (hasOAuthCallbackParams(window.location.href)) {
      void handleOAuthCallback(window.location.href);
      window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
    }

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = getNativeBridge()?.onUpdateStatus?.((nextStatus) => {
      setUpdateStatus(nextStatus);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (authState.status !== 'profile_incomplete') {
      return;
    }

    setProfileCompletionForm({
      displayName: authState.profile?.display_name ?? '',
      company: authState.profile?.company ?? ''
    });
  }, [authState.status, authState.profile?.id]);

  useEffect(() => {
    if (activeScreen === 'admin' && !isAdmin) {
      setActiveScreen('help');
    }
  }, [activeScreen, isAdmin]);

  useEffect(() => {
    if (activeScreen === 'admin' && isAdmin) {
      void refreshAdminRows();
    }
  }, [activeScreen, isAdmin]);

  useEffect(() => {
    void window.constructView?.resizeWindow?.({ width: 998, height: 826 });
  }, [activeScreen]);

  useEffect(() => {
    if (!status || (status.kind === 'info' && isProcessing)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setStatus(null);
    }, status.kind === 'error' ? 4600 : 2600);

    return () => window.clearTimeout(timeoutId);
  }, [status, isProcessing]);

  useEffect(() => {
    const workspaceKey = activeWorkspaceKey;
    if (!selectedPhotoPath) {
      updateWorkspaceFor(workspaceKey, (current) => ({ ...current, previewDataUrl: '' }));
      return;
    }

    let canceled = false;
    window.constructView.getImageDataUrl(selectedPhotoPath).then((result) => {
      if (canceled) return;
      if (result.ok && result.dataUrl) {
        updateWorkspaceFor(workspaceKey, (current) => ({ ...current, previewDataUrl: result.dataUrl ?? '' }));
      } else {
        updateWorkspaceFor(workspaceKey, (current) => ({ ...current, previewDataUrl: '' }));
        setStatusMessage('error', result.error ?? '미리보기 이미지를 읽을 수 없습니다.');
      }
    });

    return () => {
      canceled = true;
    };
  }, [activeWorkspaceKey, selectedPhotoPath]);

  useEffect(() => {
    const workspaceKey = activeWorkspaceKey;
    if (timeOptions.mode !== 'exif' || photos.length === 0) {
      return;
    }

    window.constructView.readPhotoDateTimes(photos.map((photo) => photo.path)).then((result) => {
      if (result.ok) {
        updateWorkspaceFor(workspaceKey, (current) => ({ ...current, exifMap: result.map }));
      } else {
        setStatusMessage('error', result.error ?? 'EXIF 정보를 읽을 수 없습니다.');
      }
    });
  }, [activeWorkspaceKey, timeOptions.mode, photos]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT';
      const key = event.key.toLowerCase();

      if (event.altKey && !event.ctrlKey && key === '1') {
        event.preventDefault();
        void handleSelectPhotos();
        return;
      }
      if (event.altKey && !event.ctrlKey && key === '2') {
        event.preventDefault();
        void handleSelectPhotoFolder();
        return;
      }
      if (event.altKey && !event.ctrlKey && key === '3') {
        event.preventDefault();
        setShowPhotoList(true);
        return;
      }
      if (event.altKey && !event.ctrlKey && key === '4') {
        event.preventDefault();
        handleClearPhotos();
        return;
      }
      if (event.altKey && !event.ctrlKey && key === '5') {
        event.preventDefault();
        openLargePreview();
        return;
      }
      if (event.altKey && event.ctrlKey && key === 's') {
        event.preventDefault();
        void handleSelectSaveFolder();
        return;
      }

      if (editing) {
        return;
      }
      if (!isWorkspaceScreen(activeScreen)) {
        return;
      }

      if (event.key === 'PageUp') {
        event.preventDefault();
        moveSelectedPhoto(-1);
      } else if (event.key === 'PageDown') {
        event.preventDefault();
        moveSelectedPhoto(1);
      } else if (event.key === 'Delete') {
        event.preventDefault();
        handleDeleteSelectedField();
      } else if (event.key === 'F4') {
        event.preventDefault();
        insertSelectedFileName();
      } else if (event.key === 'F5') {
        event.preventDefault();
        updateFieldByLabel('날짜', formatBoardDate(new Date()));
      } else if (event.key === 'F12') {
        event.preventDefault();
        document.body.classList.toggle('compact-screen');
        setStatusMessage('info', '화면 배율 표시를 전환했습니다.');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function setStatusMessage(kind: StatusKind, text: string) {
    setStatus({ kind, text });
  }

  async function loadAuthForUser(user: SupabaseUser, canceled = false) {
    if (!isSupabaseConfigured) return;
    try {
      setAuthState({ status: 'loading' });
      if (isStoredAuthSessionExpired()) {
        await signOut();
        window.localStorage.removeItem(authSessionStartedAtKey);
        if (!canceled) {
          setAuthState({
            status: 'unauthenticated',
            message: '보안을 위해 로그인 세션이 만료되었습니다. 다시 로그인하세요.'
          });
        }
        return;
      }

      ensureAuthSessionStart();
      const identity = await getAuthDeviceIdentity();
      if (!identity.ok || !identity.fingerprint || !identity.deviceName) {
        throw new Error(identity.error ?? '기기 정보를 확인할 수 없습니다.');
      }

      const nextState = await resolveAuthGateState(user, identity.fingerprint, identity.deviceName, {
        skipDeviceClaim: identity.skipDeviceClaim
      });
      if (!canceled) {
        setAuthState(nextState);
      }
    } catch (error) {
      if (!canceled) {
        setAuthState({ status: 'error', message: toUiError(error) });
      }
    }
  }

  async function handleAuthSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authForm.email.trim() || !authForm.password) {
      setAuthState({ status: 'unauthenticated', message: '이메일과 비밀번호를 입력하세요.' });
      return;
    }

    try {
      setAuthBusy(true);
      const user =
        authMode === 'signin'
          ? await signInWithPassword(authForm)
          : await signUpWithPassword(authForm);
      if (!user) {
        setAuthState({
          status: 'unauthenticated',
          message: '이메일 확인이 필요한 계정입니다. 메일함을 확인한 뒤 로그인하세요.'
        });
        return;
      }
      window.localStorage.setItem(authSessionStartedAtKey, String(Date.now()));
      await loadAuthForUser(user);
    } catch (error) {
      const message = toAuthUiError(error, authMode);
      if (authMode === 'signup' && isAlreadyRegisteredError(error)) {
        setAuthMode('signin');
        setAuthPasswordVisible(false);
        setAuthForm((current) => ({ ...current, password: '' }));
      }
      setAuthState({ status: 'unauthenticated', message });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSocialAuth(provider: SocialAuthProvider) {
    if (!isSupabaseConfigured) {
      setAuthState({ status: 'config_missing', message: 'Supabase 설정이 필요합니다.' });
      return;
    }

    try {
      setAuthBusy(true);
      setOauthBusyProvider(provider);
      const redirectTo = getOAuthRedirectTo();
      const authUrl = await startSocialSignIn(provider, redirectTo);
      const nativeBridge = getNativeBridge();

      if (nativeBridge?.openOAuthUrl) {
        const result = await nativeBridge.openOAuthUrl(authUrl);
        if (!result.ok) {
          throw new Error(result.error ?? '브라우저를 열 수 없습니다.');
        }
        setAuthState({
          status: 'unauthenticated',
          message: '기본 브라우저에서 인증을 완료하면 앱으로 자동 복귀합니다.'
        });
      } else {
        window.location.assign(authUrl);
      }
    } catch (error) {
      setAuthState({ status: 'unauthenticated', message: toSocialAuthUiError(error, provider) });
    } finally {
      setAuthBusy(false);
      setOauthBusyProvider(null);
    }
  }

  async function handleOAuthCallback(callbackUrl: string) {
    try {
      setAuthBusy(true);
      setAuthState({
        status: 'loading',
        message: '소셜 계정 인증을 마무리하고 있습니다.'
      });
      const user = await exchangeOAuthSessionFromUrl(callbackUrl);
      const resolvedUser = user ?? (await getCurrentUser());
      if (!resolvedUser) {
        throw new Error('로그인된 사용자를 확인하지 못했습니다.');
      }
      window.localStorage.setItem(authSessionStartedAtKey, String(Date.now()));
      await loadAuthForUser(resolvedUser);
    } catch (error) {
      setAuthState({ status: 'unauthenticated', message: toUiError(error) });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSocialIdentityLink(provider: SocialAuthProvider) {
    try {
      setAuthBusy(true);
      setOauthBusyProvider(provider);
      const authUrl = await linkSocialIdentity(provider, getOAuthRedirectTo());
      const nativeBridge = getNativeBridge();

      if (nativeBridge?.openOAuthUrl) {
        const result = await nativeBridge.openOAuthUrl(authUrl);
        if (!result.ok) {
          throw new Error(result.error ?? '브라우저를 열 수 없습니다.');
        }
        setStatusMessage('info', '브라우저에서 소셜 계정 연결을 완료하세요.');
      } else {
        window.location.assign(authUrl);
      }
    } catch (error) {
      setStatusMessage('error', toSocialAuthUiError(error, provider));
    } finally {
      setAuthBusy(false);
      setOauthBusyProvider(null);
    }
  }

  async function handleProfileCompletionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileCompletionForm.company.trim()) {
      setAuthState((current) => ({
        ...current,
        status: 'profile_incomplete',
        message: '회사명을 입력하세요.'
      }));
      return;
    }

    try {
      setAuthBusy(true);
      await completeCurrentProfile(profileCompletionForm);
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('로그인 세션을 확인하지 못했습니다.');
      }
      await loadAuthForUser(user);
    } catch (error) {
      setAuthState((current) => ({
        ...current,
        status: 'profile_incomplete',
        message: toUiError(error)
      }));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      setAuthBusy(true);
      await signOut();
    } catch (error) {
      setStatusMessage('error', toUiError(error));
    } finally {
      window.localStorage.removeItem(authSessionStartedAtKey);
      setAuthBusy(false);
      setAuthState({ status: 'unauthenticated' });
      setActiveScreen('help');
    }
  }

  async function refreshAdminRows() {
    if (!isAdmin) return;
    try {
      setAdminBusy(true);
      setAdminError('');
      setAdminRows(await loadAdminUsers());
    } catch (error) {
      setAdminError(toUiError(error));
    } finally {
      setAdminBusy(false);
    }
  }

  async function handleAdminRoleChange(userId: string, role: UserRole) {
    await runAdminMutation(async () => updateUserRole(userId, role));
  }

  async function handleAdminAccountStatusChange(userId: string, accountStatus: AccountStatus) {
    await runAdminMutation(async () => updateAccountStatus(userId, accountStatus));
  }

  async function handleAdminSubscriptionStatusChange(userId: string, subscriptionStatus: SubscriptionStatus) {
    await runAdminMutation(async () => updateSubscriptionByAdmin(userId, { status: subscriptionStatus }));
  }

  async function handleAdminSubscriptionEndChange(userId: string, value: string) {
    const currentPeriodEnd = value ? new Date(`${value}T23:59:59`).toISOString() : null;
    await runAdminMutation(async () => updateSubscriptionByAdmin(userId, { current_period_end: currentPeriodEnd }));
  }

  async function handleAdminDeviceRevoke(userId: string, deviceId: string) {
    await runAdminMutation(async () => revokeDeviceByAdmin(userId, deviceId));
  }

  async function runAdminMutation(action: () => Promise<void>) {
    try {
      setAdminBusy(true);
      setAdminError('');
      await action();
      await refreshAdminRows();
      setStatusMessage('success', '관리자 변경사항을 저장했습니다.');
    } catch (error) {
      setAdminError(toUiError(error));
    } finally {
      setAdminBusy(false);
    }
  }

  function updateAuthForm(field: keyof typeof authForm, value: string) {
    setAuthForm((current) => ({ ...current, [field]: value }));
  }

  function updateProfileCompletionForm(field: keyof ProfileCompletionInput, value: string) {
    setProfileCompletionForm((current) => ({ ...current, [field]: value }));
  }

  function toggleAuthMode() {
    setAuthMode((current) => (current === 'signin' ? 'signup' : 'signin'));
    setAuthPasswordVisible(false);
    setAuthForm((current) => ({ ...current, password: '' }));
    setAuthState({ status: 'unauthenticated' });
  }

  function openLargePreview() {
    setPreviewRevision((current) => current + 1);
    setShowLargePreview(true);
  }

  function refreshPreview() {
    setPreviewRevision((current) => current + 1);
  }

  function normalizeSettings(nextSettings: BoardSettings): BoardSettings {
    const columnRatios = normalizeColumnRatios(nextSettings);
    const widthRatio = columnRatios.widthRatio;
    const jpgQuality = Number.isFinite(nextSettings.jpgQuality) ? nextSettings.jpgQuality : defaultSettings.jpgQuality;
    const boardBackgroundOpacity = Number.isFinite(nextSettings.boardBackgroundOpacity)
      ? nextSettings.boardBackgroundOpacity
      : defaultSettings.boardBackgroundOpacity;
    const outputMaxLongEdge = Number.isFinite(nextSettings.outputMaxLongEdge)
      ? nextSettings.outputMaxLongEdge
      : defaultSettings.outputMaxLongEdge;
    return {
      ...nextSettings,
      boardLayoutMode: nextSettings.boardLayoutMode ?? 'table',
      widthRatio,
      boardSize: widthRatioToBoardSize(widthRatio),
      labelColumnWidthRatio: columnRatios.labelColumnWidthRatio,
      valueColumnWidthRatio: columnRatios.valueColumnWidthRatio,
      jpgQuality: clamp(Math.round(jpgQuality), 1, 100),
      boardBackgroundOpacity: clamp(Math.round(boardBackgroundOpacity), 0, 100),
      outputMaxLongEdge: Math.max(0, Math.round(outputMaxLongEdge))
    };
  }

  function updateSettings(patch: Partial<BoardSettings>) {
    setSettings((current) => {
      const merged = { ...current, ...patch };
      const updatesBoardWidth =
        (typeof patch.boardSize === 'number' || typeof patch.widthRatio === 'number') &&
        typeof patch.labelColumnWidthRatio !== 'number' &&
        typeof patch.valueColumnWidthRatio !== 'number';
      if (updatesBoardWidth) {
        const widthRatio = typeof patch.widthRatio === 'number'
          ? clampBoardWidthRatio(patch.widthRatio)
          : boardSizeToWidthRatio(patch.boardSize);
        const currentTotal = Math.max(0.001, current.labelColumnWidthRatio + current.valueColumnWidthRatio);
        const labelShare = clamp(current.labelColumnWidthRatio / currentTotal, 0.12, 0.55);
        merged.widthRatio = widthRatio;
        merged.labelColumnWidthRatio = Number((widthRatio * labelShare).toFixed(3));
        merged.valueColumnWidthRatio = Number((widthRatio - merged.labelColumnWidthRatio).toFixed(3));
      }
      return normalizeSettings(merged);
    });
    refreshPreview();
  }

  function normalizeCommonOutputSettings(nextSettings: CommonOutputSettings): CommonOutputSettings {
    return {
      ...nextSettings,
      jpgQuality: clamp(Math.round(Number(nextSettings.jpgQuality)), 1, 100),
      outputMaxLongEdge: Math.max(0, Math.round(Number(nextSettings.outputMaxLongEdge))),
      outputGrayscale: Boolean(nextSettings.outputGrayscale),
      openFolderAfterProcessing: Boolean(nextSettings.openFolderAfterProcessing),
      createPdf: Boolean(nextSettings.createPdf),
      pdfTitle: nextSettings.pdfTitle || '사진대지'
    };
  }

  function mergeCommonOutputSettings(settingsValue: BoardSettings, commonSettings = commonOutputSettings): BoardSettings {
    return normalizeSettings({
      ...settingsValue,
      ...commonSettings
    });
  }

  function updateCommonOutputSettings(patch: Partial<CommonOutputSettings>) {
    setCommonOutputSettings((current) => {
      const next = normalizeCommonOutputSettings({ ...current, ...patch });
      setWorkspaces((currentWorkspaces) => {
        const nextWorkspaces = { ...currentWorkspaces };
        (Object.keys(nextWorkspaces) as WorkspaceScreen[]).forEach((key) => {
          nextWorkspaces[key] = {
            ...nextWorkspaces[key],
            settings: mergeCommonOutputSettings(nextWorkspaces[key].settings, next),
            previewRevision: nextWorkspaces[key].previewRevision + 1
          };
        });
        return nextWorkspaces;
      });
      return next;
    });
  }

  async function handleSelectPhotos() {
    const workspaceKey = activeWorkspaceKey;
    const result = await window.constructView.selectPhotos();
    if (result.canceled) return;
    addPhotos(result.photos, workspaceKey);
  }

  async function handleSelectPhotoFolder() {
    const workspaceKey = activeWorkspaceKey;
    const result = await window.constructView.selectPhotoFolder();
    if (result.canceled) return;
    addPhotos(result.photos, workspaceKey);
  }

  async function handleDroppedPhotoPaths(paths: string[], workspaceKey: WorkspaceScreen) {
    const result = await window.constructView.resolveDroppedPhotos(paths);
    if (result.canceled) return;
    addPhotos(result.photos, workspaceKey);
  }

  function extractDroppedPaths(event: React.DragEvent<HTMLElement>) {
    return Array.from(event.dataTransfer.files)
      .map((file) => window.constructView.getPathForFile?.(file) || (file as File & { path?: string }).path)
      .filter((filePath): filePath is string => Boolean(filePath));
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    if (!isWorkspaceScreen(activeScreen)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragTargetActive(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragTargetActive(false);
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragTargetActive(false);
    if (!isWorkspaceScreen(activeScreen)) {
      setStatusMessage('info', '사진은 보드판 작업 탭에서 끌어오세요.');
      return;
    }
    const workspaceKey = activeWorkspaceKey;
    const paths = extractDroppedPaths(event);
    if (paths.length === 0) {
      setStatusMessage('error', '끌어온 항목에서 파일 경로를 확인하지 못했습니다.');
      return;
    }
    void handleDroppedPhotoPaths(paths, workspaceKey);
  }

  function addPhotos(incoming: PhotoItem[], workspaceKey = activeWorkspaceKey) {
    if (incoming.length === 0) {
      setStatusMessage('info', '선택한 위치에 지원되는 사진이 없습니다.');
      return;
    }

    updateWorkspaceFor(workspaceKey, (current) => {
      const byPath = new Map(current.photos.map((photo) => [photo.path, photo]));
      incoming.forEach((photo) => {
        if (!byPath.has(photo.path)) {
          byPath.set(photo.path, photo);
        }
      });
      const next = Array.from(byPath.values());
      return {
        ...current,
        photos: next,
        selectedPhotoPath: current.selectedPhotoPath || next[0]?.path || ''
      };
    });
    setStatusMessage('success', `${incoming.length}장의 사진을 불러왔습니다.`);
  }

  function handleClearPhotos() {
    if (photos.length === 0) {
      setStatusMessage('info', '초기화할 사진이 없습니다.');
      return;
    }
    if (!window.confirm('불러온 사진 목록을 초기화할까요?')) {
      return;
    }
    setPhotos([]);
    setSelectedPhotoPath('');
    updateActiveWorkspace((current) => ({ ...current, previewDataUrl: '' }));
    setStatusMessage('success', '불러온 사진 목록을 초기화했습니다.');
  }

  async function handleSelectSaveFolder() {
    const workspaceKey = activeWorkspaceKey;
    const result = await window.constructView.selectSaveFolder();
    if (result.canceled || !result.path) return;
    updateWorkspaceFor(workspaceKey, (current) => ({ ...current, saveDir: result.path ?? '' }));
    setStatusMessage('success', '저장 경로를 지정했습니다.');
  }

  async function handleOpenSaveFolder() {
    const result = await window.constructView.openFolder(saveDir);
    if (result.ok) {
      setStatusMessage('success', '저장 폴더를 열었습니다.');
    } else {
      setStatusMessage('error', result.error ?? '저장 폴더를 열 수 없습니다.');
    }
  }

  async function handleImportSheet() {
    const workspaceKey = activeWorkspaceKey;
    const result = await window.constructView.importDateTimeSheet();
    if (result.canceled) return;

    if (!result.ok) {
      setStatusMessage('error', result.error ?? 'CSV/XLSX 파일을 읽을 수 없습니다.');
      return;
    }

    updateWorkspaceFor(workspaceKey, (current) => ({
      ...current,
      timeOptions: {
        ...current.timeOptions,
        mode: 'sheet',
        sheetPath: result.filePath,
        sheetMap: result.map
      }
    }));
    setStatusMessage('success', `${Object.keys(result.map).length}건의 사진별 날짜/시간을 불러왔습니다.`);
  }

  function updateField(id: string, patch: Partial<BoardField>) {
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...patch } : field)));
    refreshPreview();
  }

  function addField() {
    const field = { id: crypto.randomUUID(), label: '항목', value: '' };
    setFields((current) => [...current, field]);
    setSelectedFieldId(field.id);
    refreshPreview();
  }

  function deleteField(id: string) {
    if (fields.length <= 1) {
      setStatusMessage('error', '보드판 항목은 최소 1개 이상 필요합니다.');
      return;
    }
    setFields((current) => current.filter((field) => field.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(fields.find((field) => field.id !== id)?.id ?? '');
    }
    refreshPreview();
  }

  function handleDeleteSelectedField() {
    if (!selectedFieldId) {
      setStatusMessage('info', '삭제할 보드판 행을 선택하세요.');
      return;
    }
    deleteField(selectedFieldId);
  }

  function updateFieldByLabel(label: string, value: string) {
    setFields((current) =>
      current.map((field) => (field.label.includes(label) ? { ...field, value } : field))
    );
    refreshPreview();
  }

  function insertSelectedFileName() {
    if (!selectedPhoto) {
      setStatusMessage('info', '파일명을 삽입할 사진을 먼저 선택하세요.');
      return;
    }
    const targetId = selectedFieldId || fields[0]?.id;
    if (!targetId) return;
    updateField(targetId, { value: selectedPhoto.name });
    setStatusMessage('success', '선택한 행에 파일명을 삽입했습니다.');
  }

  function moveSelectedPhoto(direction: -1 | 1) {
    if (photos.length === 0) return;
    const currentIndex = Math.max(0, selectedIndex);
    const nextIndex = clamp(currentIndex + direction, 0, photos.length - 1);
    setSelectedPhotoPath(photos[nextIndex].path);
  }

  function togglePhotoChecked(pathValue: string) {
    setPhotos((current) =>
      current.map((photo) =>
        photo.path === pathValue ? { ...photo, selectedForProcessing: !photo.selectedForProcessing } : photo
      )
    );
  }

  function removePhoto(pathValue: string) {
    setPhotos((current) => current.filter((photo) => photo.path !== pathValue));
    if (selectedPhotoPath === pathValue) {
      const next = photos.find((photo) => photo.path !== pathValue);
      setSelectedPhotoPath(next?.path ?? '');
    }
  }

  function setAllPhotoChecks(value: boolean) {
    setPhotos((current) => current.map((photo) => ({ ...photo, selectedForProcessing: value })));
  }

  function invertPhotoChecks() {
    setPhotos((current) => current.map((photo) => ({ ...photo, selectedForProcessing: !photo.selectedForProcessing })));
  }

  function updateSelectedPhotoHighlight(nextHighlight: PhotoHighlight | undefined) {
    if (!selectedPhotoPath) return;
    setPhotos((current) =>
      current.map((photo) => (photo.path === selectedPhotoPath ? { ...photo, highlight: nextHighlight } : photo))
    );
    refreshPreview();
  }

  function setSelectedHighlightEnabled(enabled: boolean) {
    if (!selectedPhotoPath) {
      setStatusMessage('info', '강조 표시할 사진을 먼저 선택하세요.');
      return;
    }
    updateSelectedPhotoHighlight(enabled ? { ...(selectedPhoto?.highlight ?? defaultHighlight), enabled: true } : undefined);
  }

  function updateSelectedHighlightPatch(patch: Partial<PhotoHighlight>) {
    if (!selectedPhotoPath) {
      setStatusMessage('info', '강조 표시할 사진을 먼저 선택하세요.');
      return;
    }
    updateSelectedPhotoHighlight({ ...(selectedPhoto?.highlight ?? defaultHighlight), ...patch, enabled: true });
  }

  async function runProcess(mode: ProcessImagesPayload['mode']) {
    if (photos.length === 0) {
      setStatusMessage('error', '처리할 사진을 먼저 불러오세요.');
      return;
    }
    if (!saveDir) {
      setStatusMessage('error', '저장 경로를 먼저 지정하세요.');
      return;
    }
    if ((mode === 'selected' && !selectedPhotoPath) || (mode === 'checked' && !photos.some((photo) => photo.selectedForProcessing))) {
      setStatusMessage('error', '처리할 사진을 선택하세요.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('info', '사진을 처리하는 중입니다.');

    const processSettings = mergeCommonOutputSettings(settings);
    const payload: ProcessImagesPayload = {
      photos,
      selectedPhotoPath,
      mode,
      saveDir,
      fields,
      settings: processSettings,
      timeOptions
    };

    const result = await window.constructView.processImages(payload);
    setIsProcessing(false);

    if (!result.ok) {
      setStatusMessage('error', result.error ?? '작업을 완료하지 못했습니다.');
      return;
    }

    const pdfText = result.pdfPath ? ` PDF도 생성했습니다.` : '';
    const folderText = processSettings.openFolderAfterProcessing ? ' 결과 폴더를 열었습니다.' : '';
    setStatusMessage('success', `${result.savedFiles.length}개의 JPG 파일을 저장했습니다.${pdfText}${folderText}`);
  }

  async function handleCopyPreviewImage() {
    if (!selectedPhoto) {
      setStatusMessage('info', '복사할 미리보기 사진을 먼저 선택하세요.');
      return;
    }

    const result = await window.constructView.copyPreviewImage({
      photo: selectedPhoto,
      fields: previewFields,
      settings: normalizeSettings(settings)
    });

    if (result.ok) {
      setStatusMessage('success', '미리보기 이미지를 클립보드에 복사했습니다.');
    } else {
      setStatusMessage('error', result.error ?? '미리보기 이미지를 복사하지 못했습니다.');
    }
  }

  function renderTopNavigation() {
    const navItems: Array<{ id: Screen; label: string }> = [
      { id: 'help', label: '사용방법' },
      { id: 'basic', label: '보드판 [간편]' },
      { id: 'advanced', label: '보드판 작성 [고급]' },
      { id: 'output', label: '보드판 작성 [프리미엄]' },
      { id: 'commonSettings', label: '통합 설정' },
      { id: 'contact', label: '문의하기' }
    ];
    const signedInUserName = formatProfileName(authState.profile);
    if (isAdmin) {
      navItems.push({ id: 'admin', label: '관리자' });
    }

    return (
      <header className="top-nav">
        <nav className="nav-links">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activeScreen === item.id ? 'nav-link active' : 'nav-link'}
              onClick={() => setActiveScreen(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="nav-user">
          <span title={authState.profile?.email ?? signedInUserName}>{signedInUserName}</span>
          {isAdmin && <ShieldCheck size={17} aria-label="관리자" />}
          <User size={19} aria-hidden />
          <button type="button" className="nav-logout" onClick={handleLogout} disabled={authBusy}>
            <LogOut size={15} aria-hidden />
            로그아웃
          </button>
        </div>
      </header>
    );
  }

  function renderStatus() {
    if (!status) return null;
    return <div className={`status-bar ${status.kind}`}>{status.text}</div>;
  }

  function renderAuthScreen() {
    const titleByStatus: Record<AuthGateState['status'], string> = {
      loading: '로그인 상태 확인 중',
      config_missing: 'Supabase 설정 필요',
      unauthenticated: '로그인',
      profile_incomplete: '회사 정보 입력',
      ready: '로그인 완료',
      restricted: '사용 제한',
      device_blocked: '등록 기기 제한',
      error: '로그인 오류'
    };

    return (
      <div className="auth-shell">
        <section className="auth-card">
          <div className="auth-mark">
            <LockKeyhole size={34} aria-hidden />
          </div>
          <h1>{titleByStatus[authState.status]}</h1>
          {authState.message && <p className="auth-message">{authState.message}</p>}
          {authState.status === 'loading' && <p className="auth-message">잠시만 기다려주세요.</p>}

          {authState.status === 'config_missing' && (
            <div className="auth-config">
              <p>`.env` 파일에 아래 값을 설정한 뒤 앱을 다시 실행하세요.</p>
              <code>VITE_SUPABASE_URL</code>
              <code>VITE_SUPABASE_ANON_KEY</code>
              <small>초기 관리자 이메일: {INITIAL_ADMIN_EMAIL}</small>
            </div>
          )}

          {(authState.status === 'unauthenticated' || authState.status === 'error') && (
            <div className="auth-login-stack">
              <form className="auth-form compact" onSubmit={handleAuthSubmit}>
                <label>
                  이메일
                  <input
                    type="email"
                    value={authForm.email}
                    onChange={(event) => updateAuthForm('email', event.currentTarget.value)}
                    autoComplete="email"
                  />
                </label>
                <label>
                  비밀번호
                  <div className="auth-password-field">
                    <input
                      type={authPasswordVisible ? 'text' : 'password'}
                      value={authForm.password}
                      onChange={(event) => updateAuthForm('password', event.currentTarget.value)}
                      autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setAuthPasswordVisible((current) => !current)}
                      aria-label={authPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                      title={authPasswordVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {authPasswordVisible ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
                    </button>
                  </div>
                </label>
                {authMode === 'signup' && (
                  <>
                    <label>
                      이름
                      <input
                        value={authForm.displayName}
                        onChange={(event) => updateAuthForm('displayName', event.currentTarget.value)}
                        autoComplete="name"
                      />
                    </label>
                    <label>
                      회사명
                      <input
                        value={authForm.company}
                        onChange={(event) => updateAuthForm('company', event.currentTarget.value)}
                        autoComplete="organization"
                      />
                    </label>
                  </>
                )}
                <button type="submit" className="primary-button wide" disabled={authBusy}>
                  {authBusy ? '처리 중...' : authMode === 'signin' ? '로그인' : '회원가입'}
                </button>
                <button
                  type="button"
                  className="link-button"
                  onClick={toggleAuthMode}
                >
                  {authMode === 'signin' ? '이메일 계정 만들기' : '이미 계정이 있습니다'}
                </button>
              </form>

              <div className="auth-divider">
                <span>또는</span>
              </div>

              <div className="social-auth-buttons" aria-label="소셜 로그인">
                {visibleSocialAuthProviders.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    className={`social-auth-button ${provider.id}`}
                    onClick={() => void handleSocialAuth(provider.id)}
                    disabled={authBusy}
                  >
                    <span aria-hidden>{provider.badge}</span>
                    {oauthBusyProvider === provider.id ? '브라우저 여는 중...' : provider.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {authState.status === 'profile_incomplete' && (
            <form className="auth-form" onSubmit={handleProfileCompletionSubmit}>
              <label>
                이메일
                <input className="readonly-field" value={authState.profile?.email ?? ''} readOnly />
              </label>
              <label>
                이름
                <input
                  value={profileCompletionForm.displayName ?? ''}
                  onChange={(event) => updateProfileCompletionForm('displayName', event.currentTarget.value)}
                  autoComplete="name"
                />
              </label>
              <label>
                회사명
                <input
                  value={profileCompletionForm.company}
                  onChange={(event) => updateProfileCompletionForm('company', event.currentTarget.value)}
                  autoComplete="organization"
                  required
                />
              </label>
              <button type="submit" className="primary-button wide" disabled={authBusy}>
                {authBusy ? '저장 중...' : '저장하고 시작'}
              </button>
              <button type="button" className="secondary-button wide" onClick={handleLogout} disabled={authBusy}>
                로그아웃
              </button>
            </form>
          )}

          {(authState.status === 'restricted' || authState.status === 'device_blocked') && (
            <div className="auth-actions">
              <p>{authState.profile?.email}</p>
              <button type="button" className="secondary-button" onClick={handleLogout}>
                로그아웃
              </button>
            </div>
          )}
        </section>
      </div>
    );
  }

  function renderHelpScreen() {
    return (
      <main className="page-shell help-shell">
        <section className="help-guide-card" aria-label="보드판 작성 단축키 및 조합키 안내">
          <img
            className="help-guide-image"
            src={`${assetBaseUrl}usage-guide.png`}
            alt="보드판 작성 단축키 및 조합키 안내"
          />
        </section>
      </main>
    );
  }

  function renderBasicScreen() {
    return (
      <main className="page-shell">
        <div className="basic-grid">
          <div className="panel-column">
            <Panel title="1. 보드용 사진 불러오기">
              <div className="form-row photo-select-row">
                <label>불러온 사진 목록</label>
                <select value={selectedPhotoPath} onChange={(event) => setSelectedPhotoPath(event.target.value)}>
                  <option value="">사진을 선택하세요</option>
                  {photos.map((photo) => (
                    <option key={photo.path} value={photo.path}>
                      {photo.name}
                    </option>
                  ))}
                </select>
              </div>
              {photos.length === 0 && <p className="empty-line">불러온 사진이 없습니다.</p>}
              <div className="button-row three">
                <button className="btn primary" type="button" onClick={handleSelectPhotos}>
                  <Camera size={17} /> 사진 불러오기
                </button>
                <button className="btn primary" type="button" onClick={handleSelectPhotoFolder}>
                  <FolderOpen size={17} /> 폴더 불러오기
                </button>
                <button className="btn outline" type="button" onClick={() => setShowPhotoList(true)}>
                  자세히 보기
                </button>
              </div>
              <button className="text-action danger-text" type="button" onClick={handleClearPhotos}>
                <RotateCcw size={15} /> 불러온 사진 초기화
              </button>
            </Panel>

            <Panel title="2. 보드 크기 및 옵션 설정">
              <div className="position-presets">
                {(Object.keys(positionLabels) as BoardPosition[]).map((position) => (
                  <label key={position} className="position-preset">
                    <span className={`mini-frame ${position}`}>
                      <span />
                    </span>
                    <input
                      type="radio"
                      name="basic-position"
                      checked={settings.position === position}
                      onChange={() => updateSettings({ position })}
                    />
                    <span>{positionLabels[position]}</span>
                  </label>
                ))}
              </div>
              <SliderRow
                label="보드 크기"
                min={widthRatioToBoardSize(MIN_BOARD_WIDTH_RATIO)}
                max={widthRatioToBoardSize(MAX_BOARD_WIDTH_RATIO)}
                value={settings.boardSize}
                onChange={(value) => updateSettings({ boardSize: value })}
              />
              <div className="form-row">
                <label>글꼴 선택</label>
                <select value={settings.fontFamily} onChange={(event) => updateSettings({ fontFamily: event.target.value })}>
                  <option>Malgun Gothic Semilight</option>
                  <option>Malgun Gothic</option>
                  <option>Arial</option>
                  <option>Helvetica</option>
                </select>
              </div>
              <SliderRow
                label="글자 크기"
                min={12}
                max={28}
                value={settings.fontSize}
                suffix="px"
                onChange={(value) => updateSettings({ fontSize: value })}
              />
              <div className="option-grid">
                <RadioGroup
                  label="항목 텍스트 정렬"
                  name="item-align"
                  value={settings.itemAlign}
                  options={[
                    ['left', '왼쪽'],
                    ['center', '가운데']
                  ]}
                  onChange={(value) => updateSettings({ itemAlign: value as HorizontalAlign })}
                />
                <RadioGroup
                  label="내용 정렬"
                  name="content-align"
                  value={settings.contentAlign}
                  options={[
                    ['left', '왼쪽'],
                    ['center', '가운데']
                  ]}
                  onChange={(value) => updateSettings({ contentAlign: value as HorizontalAlign })}
                />
              </div>
              <div className="option-grid">
                <RadioGroup
                  label="글자 굵기"
                  name="font-weight"
                  value={settings.fontWeight}
                  options={[
                    ['normal', '보통'],
                    ['bold', '굵게']
                  ]}
                  onChange={(value) => updateSettings({ fontWeight: value as BoardSettings['fontWeight'] })}
                />
                <SliderRow
                  label="행 높이"
                  min={42}
                  max={110}
                  value={settings.rowHeight}
                  onChange={(value) => updateSettings({ rowHeight: value })}
                />
              </div>
              <RadioGroup
                label="테두리"
                name="border-weight"
                value={settings.borderWeight}
                options={[
                  ['normal', '보통'],
                  ['bold', '굵게']
                ]}
                onChange={(value) => updateSettings({ borderWeight: value as BoardSettings['borderWeight'] })}
              />
            </Panel>

            <Panel title="3. 저장 경로 지정">
              <div className="button-row">
                <button className="btn primary" type="button" onClick={handleSelectSaveFolder}>
                  <Save size={17} /> 경로 지정
                </button>
                <button className="btn ghost" type="button" onClick={handleOpenSaveFolder}>
                  <FolderOpen size={17} /> 폴더 열기
                </button>
              </div>
              <div className="path-field">
                <span>저장경로:</span>
                <input value={saveDir || '저장 경로를 지정하세요'} readOnly />
              </div>
            </Panel>
          </div>

          <div className="panel-column">
            <Panel
              title="4. 보드 내용 작성"
              className="field-panel"
              actions={
                <>
                  <button className="small-btn outline" type="button" onClick={addField}>
                    <Plus size={15} /> 항목 추가
                  </button>
                  <button className="small-btn danger" type="button" onClick={handleDeleteSelectedField}>
                    <Trash2 size={15} /> 삭제
                  </button>
                </>
              }
            >
              <BoardFieldTable
                fields={fields}
                selectedFieldId={selectedFieldId}
                onSelect={setSelectedFieldId}
                onUpdate={updateField}
              />
            </Panel>

            <Panel title="5. 미리보기 및 시작" className="preview-panel">
              <PreviewStage
                imageDataUrl={previewDataUrl}
                fields={previewFields}
                settings={settings}
                previewRevision={previewRevision}
                livePreviewSignature={livePreviewSignature}
                selectedPhotoName={selectedPhoto?.name}
                emptyText="이미지 미리보기 캔버스"
                highlight={selectedHighlight}
                outputGrayscale={settings.outputGrayscale}
              />
              <div className="form-row">
                <label>대상 사진</label>
                <select value={selectedPhotoPath} onChange={(event) => setSelectedPhotoPath(event.target.value)}>
                  <option value="">사진을 선택하세요</option>
                  {photos.map((photo) => (
                    <option key={photo.path} value={photo.path}>
                      {photo.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="action-footer">
                <div className="button-row">
                  <button className="btn ghost" type="button" onClick={openLargePreview}>
                    <Eye size={17} /> 미리보기
                  </button>
                  <button className="btn ghost" type="button" disabled={!selectedPhoto} onClick={() => void handleCopyPreviewImage()}>
                    <Copy size={17} /> 결과 이미지 복사
                  </button>
                </div>
                <div className="button-row">
                  <button className="btn primary" type="button" disabled={isProcessing} onClick={() => void runProcess('selected')}>
                    1개 작업하기
                  </button>
                  <button className="btn blue" type="button" disabled={isProcessing} onClick={() => void runProcess('all')}>
                    전체 작업하기
                  </button>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      </main>
    );
  }

  function renderAdvancedActionCard() {
    return (
      <Card title="실행 버튼" icon={<Play size={17} />} className="advanced-action-card">
        <div className="advanced-action-stack">
          <button className="btn ghost wide" type="button" onClick={openLargePreview}>
            <RefreshCw size={17} /> 미리보기 갱신
          </button>
          <button className="btn blue wide" type="button" disabled={isProcessing} onClick={() => void runProcess('selected')}>
            <Play size={17} /> 선택 사진 작업
          </button>
          <button className="btn outline wide" type="button" onClick={handleOpenSaveFolder}>
            <FolderOpen size={17} /> 결과 폴더 열기
          </button>
        </div>
      </Card>
    );
  }

  function renderDateTimeSettings() {
    return (
      <div className="radio-stack">
        <TimeModeRadio label="보드판 입력값 직접 사용" value="manual" current={timeOptions.mode} onChange={setTimeMode} />
        <TimeModeRadio label="사진정보(EXIF) 자동 사용" value="exif" current={timeOptions.mode} onChange={setTimeMode} />
        <TimeModeRadio label="시작시간 + 간격 자동 입력" value="sequence" current={timeOptions.mode} onChange={setTimeMode} />
        <div className={timeOptions.mode === 'sequence' ? 'nested-options enabled' : 'nested-options'}>
          <input
            type="date"
            value={timeOptions.sequenceStartDate}
            onChange={(event) => setTimeOptions((current) => ({ ...current, sequenceStartDate: event.target.value }))}
          />
          <input
            type="time"
            value={timeOptions.sequenceStartTime}
            onChange={(event) => setTimeOptions((current) => ({ ...current, sequenceStartTime: event.target.value }))}
          />
          <label>간격(분)</label>
          <input
            type="number"
            value={timeOptions.sequenceIntervalMinutes}
            min={0}
            onChange={(event) =>
              setTimeOptions((current) => ({ ...current, sequenceIntervalMinutes: Number(event.target.value) }))
            }
          />
        </div>
        <TimeModeRadio label="사진별 CSV/XLSX 직접 입력" value="sheet" current={timeOptions.mode} onChange={setTimeMode} />
        <div className="sheet-picker">
          <input value={timeOptions.sheetPath ? trimPath(timeOptions.sheetPath) : '파일을 선택하세요'} readOnly />
          <button type="button" onClick={handleImportSheet}>
            <FileSpreadsheet size={15} /> 파일 선택
          </button>
        </div>
      </div>
    );
  }

  function renderBoardLayoutSettings() {
    return (
      <div className="settings-form board-pdf-form">
        <label>보드 형태</label>
        <select value={settings.boardLayoutMode} onChange={(event) => updateSettings({ boardLayoutMode: event.target.value as BoardLayoutMode })}>
          <option value="table">표형 보드</option>
          <option value="bottom-strip">하부 띠</option>
        </select>
        <label>위치</label>
        <select
          value={settings.position}
          onChange={(event) => updateSettings({ position: event.target.value as BoardPosition })}
          disabled={settings.boardLayoutMode === 'bottom-strip'}
        >
          {(Object.keys(positionLabels) as BoardPosition[]).map((position) => (
            <option key={position} value={position}>
              {positionLabels[position]}
            </option>
          ))}
        </select>
        {settings.boardLayoutMode === 'table' && (
          <>
            <label>보드크기</label>
            <div className="range-with-number">
              <input
                type="range"
                min={MIN_BOARD_WIDTH_RATIO}
                max={MAX_BOARD_WIDTH_RATIO}
                step={0.005}
                value={settings.widthRatio}
                onChange={(event) => {
                  updateSettings({ widthRatio: Number(event.target.value) });
                }}
              />
              <input
                type="number"
                min={MIN_BOARD_WIDTH_RATIO}
                max={MAX_BOARD_WIDTH_RATIO}
                step={0.005}
                value={settings.widthRatio}
                onChange={(event) => {
                  const value = Number(clampBoardWidthRatio(Number(event.target.value)).toFixed(3));
                  updateSettings({ widthRatio: value });
                }}
              />
            </div>
          </>
        )}
        <label>항목명 칸</label>
        <div className="range-with-number">
          <input
            type="range"
            min={MIN_LABEL_COLUMN_WIDTH_RATIO}
            max={MAX_LABEL_COLUMN_WIDTH_RATIO}
            step={0.005}
            value={settings.labelColumnWidthRatio}
            onChange={(event) => updateSettings({ labelColumnWidthRatio: Number(event.target.value) })}
          />
          <input
            type="number"
            min={MIN_LABEL_COLUMN_WIDTH_RATIO}
            max={MAX_LABEL_COLUMN_WIDTH_RATIO}
            step={0.005}
            value={settings.labelColumnWidthRatio}
            onChange={(event) => updateSettings({ labelColumnWidthRatio: Number(event.target.value) })}
          />
        </div>
        <label>내용 칸</label>
        <div className="range-with-number">
          <input
            type="range"
            min={MIN_VALUE_COLUMN_WIDTH_RATIO}
            max={MAX_VALUE_COLUMN_WIDTH_RATIO}
            step={0.005}
            value={settings.valueColumnWidthRatio}
            onChange={(event) => updateSettings({ valueColumnWidthRatio: Number(event.target.value) })}
          />
          <input
            type="number"
            min={MIN_VALUE_COLUMN_WIDTH_RATIO}
            max={MAX_VALUE_COLUMN_WIDTH_RATIO}
            step={0.005}
            value={settings.valueColumnWidthRatio}
            onChange={(event) => updateSettings({ valueColumnWidthRatio: Number(event.target.value) })}
          />
        </div>
        <label>행 높이</label>
        <div className="range-with-number">
          <input
            type="range"
            min={42}
            max={110}
            step={1}
            value={settings.rowHeight}
            onChange={(event) => updateSettings({ rowHeight: Number(event.target.value) })}
          />
          <input
            type="number"
            min={42}
            max={110}
            step={1}
            value={settings.rowHeight}
            onChange={(event) => updateSettings({ rowHeight: clamp(Number(event.target.value), 42, 110) })}
          />
        </div>
      </div>
    );
  }

  function renderBoardTypographySettings() {
    return (
      <div className="settings-form board-pdf-form">
        <label>글자크기</label>
        <div className="range-with-number">
          <input
            type="range"
            min={12}
            max={28}
            step={1}
            value={settings.fontSize}
            onChange={(event) => updateSettings({ fontSize: Number(event.target.value) })}
          />
          <input
            type="number"
            min={12}
            max={28}
            step={1}
            value={settings.fontSize}
            onChange={(event) => updateSettings({ fontSize: clamp(Number(event.target.value), 12, 28) })}
          />
        </div>
        <label>글꼴</label>
        <select value={settings.fontFamily} onChange={(event) => updateSettings({ fontFamily: event.target.value })}>
          <option>Malgun Gothic Semilight</option>
          <option>Malgun Gothic</option>
          <option>Arial</option>
          <option>Helvetica</option>
        </select>
        <label>항목 정렬</label>
        <select value={settings.itemAlign} onChange={(event) => updateSettings({ itemAlign: event.target.value as HorizontalAlign })}>
          <option value="left">왼쪽</option>
          <option value="center">가운데</option>
        </select>
        <label>내용 정렬</label>
        <select value={settings.contentAlign} onChange={(event) => updateSettings({ contentAlign: event.target.value as HorizontalAlign })}>
          <option value="left">왼쪽</option>
          <option value="center">가운데</option>
        </select>
        <label>글자 굵기</label>
        <select value={settings.fontWeight} onChange={(event) => updateSettings({ fontWeight: event.target.value as BoardSettings['fontWeight'] })}>
          <option value="normal">보통</option>
          <option value="bold">굵게</option>
        </select>
        <label>테두리 굵기</label>
        <select value={settings.borderWeight} onChange={(event) => updateSettings({ borderWeight: event.target.value as BoardSettings['borderWeight'] })}>
          <option value="normal">보통</option>
          <option value="bold">굵게</option>
        </select>
      </div>
    );
  }

  function renderAdvancedBoardSettings() {
    return (
      <div className="board-settings-stack">
        <div className="sub-settings-tabs" role="tablist" aria-label="보드판 세부 설정">
          <button
            type="button"
            role="tab"
            aria-selected={activeAdvancedBoardTab === 'layout'}
            className={activeAdvancedBoardTab === 'layout' ? 'sub-settings-tab active' : 'sub-settings-tab'}
            onClick={() => setActiveAdvancedBoardTab('layout')}
          >
            크기/배치
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeAdvancedBoardTab === 'typography'}
            className={activeAdvancedBoardTab === 'typography' ? 'sub-settings-tab active' : 'sub-settings-tab'}
            onClick={() => setActiveAdvancedBoardTab('typography')}
          >
            글자/테두리
          </button>
        </div>
        {activeAdvancedBoardTab === 'layout' ? renderBoardLayoutSettings() : renderBoardTypographySettings()}
      </div>
    );
  }

  function renderCommonOutputSettingsForm() {
    return (
      <div className="settings-form board-pdf-form output-common-form">
        <label>JPG 품질</label>
        <input
          type="number"
          min={1}
          max={100}
          value={commonOutputSettings.jpgQuality}
          onChange={(event) => updateCommonOutputSettings({ jpgQuality: clamp(Number(event.target.value), 1, 100) })}
        />
        <label>최대 긴 변</label>
        <input
          type="number"
          min={0}
          step={100}
          value={commonOutputSettings.outputMaxLongEdge}
          onChange={(event) => updateCommonOutputSettings({ outputMaxLongEdge: Math.max(0, Number(event.target.value)) })}
        />
        <label>흑백 저장</label>
        <label className="check-label compact-check">
          <input
            type="checkbox"
            checked={commonOutputSettings.outputGrayscale}
            onChange={(event) => updateCommonOutputSettings({ outputGrayscale: event.target.checked })}
          />
          결과물 흑백 저장
        </label>
        <label>폴더 열기</label>
        <label className="check-label compact-check">
          <input
            type="checkbox"
            checked={commonOutputSettings.openFolderAfterProcessing}
            onChange={(event) => updateCommonOutputSettings({ openFolderAfterProcessing: event.target.checked })}
          />
          작업 완료 후 결과 폴더 열기
        </label>
        <div className="pdf-options">
          <label className="check-label">
            <input
              type="checkbox"
              checked={commonOutputSettings.createPdf}
              onChange={(event) => updateCommonOutputSettings({ createPdf: event.target.checked })}
            />
            PDF 생성 (사진대지)
          </label>
          <div className="form-row compact">
            <label>PDF 제목</label>
            <input value={commonOutputSettings.pdfTitle} onChange={(event) => updateCommonOutputSettings({ pdfTitle: event.target.value })} />
          </div>
        </div>
      </div>
    );
  }

  function renderCommonSettingsScreen() {
    return (
      <main className="page-shell common-settings-shell">
        <Card title="통합 설정" icon={<Settings size={17} />} className="common-settings-card">
          {renderCommonOutputSettingsForm()}
          <p className="setting-hint common-settings-hint">
            이 설정은 보드판 [간편], 보드판 작성 [고급], 보드판 작성 [프리미엄] 작업에 공통 적용됩니다.
          </p>
        </Card>
      </main>
    );
  }

  function renderIntegratedSettingsCard() {
    return (
      <Card title="고급 설정" icon={<Settings size={17} />} className="integrated-settings-card">
        <div className="settings-tabs advanced-settings-tabs" role="tablist" aria-label="고급 설정">
          <button
            type="button"
            role="tab"
            aria-selected={activeAdvancedSettingsTab === 'datetime'}
            className={activeAdvancedSettingsTab === 'datetime' ? 'settings-tab active' : 'settings-tab'}
            onClick={() => setActiveAdvancedSettingsTab('datetime')}
          >
            <Clock3 size={15} /> 날짜/촬영시간
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeAdvancedSettingsTab === 'board'}
            className={activeAdvancedSettingsTab === 'board' ? 'settings-tab active' : 'settings-tab'}
            onClick={() => setActiveAdvancedSettingsTab('board')}
          >
            <Settings size={15} /> 보드판 설정
          </button>
        </div>
        <div className="settings-tab-panel">
          {activeAdvancedSettingsTab === 'datetime' && renderDateTimeSettings()}
          {activeAdvancedSettingsTab === 'board' && renderAdvancedBoardSettings()}
        </div>
      </Card>
    );
  }

  function renderBoardFieldEditor(className = 'advanced-field-list') {
    return (
      <div className={className}>
        {fields.map((field) => (
          <div key={field.id} className="advanced-field-row">
            <input value={field.label} onInput={(event) => updateField(field.id, { label: event.currentTarget.value })} />
            <input value={field.value} onInput={(event) => updateField(field.id, { value: event.currentTarget.value })} />
            <button type="button" onClick={() => deleteField(field.id)} aria-label="항목 삭제">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    );
  }

  function renderPremiumTypographySettings() {
    return (
      <div className="premium-settings-stack">
        {renderBoardTypographySettings()}
        <div className="output-setting-section premium-display-section">
          <h4>색상/배경</h4>
          <SliderRow
            label="배경 투명도"
            min={0}
            max={100}
            value={settings.boardBackgroundOpacity}
            suffix="%"
            onChange={(value) => updateSettings({ boardBackgroundOpacity: value })}
          />
          <ColorSelectRow label="항목명 글씨" value={settings.labelTextColor} onChange={(value) => updateSettings({ labelTextColor: value })} />
          <ColorSelectRow label="내용 글씨" value={settings.valueTextColor} onChange={(value) => updateSettings({ valueTextColor: value })} />
        </div>
      </div>
    );
  }

  function renderPremiumHighlightAndActions() {
    return (
      <div className="premium-settings-stack">
        <div className="output-setting-section">
          <h4>원형 강조</h4>
          <label className="check-label">
            <input
              type="checkbox"
              checked={Boolean(selectedHighlight?.enabled)}
              disabled={!selectedPhoto}
              onChange={(event) => setSelectedHighlightEnabled(event.target.checked)}
            />
            선택 사진 원형 강조
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={Boolean(selectedHighlight?.outsideGrayscale)}
              disabled={!selectedHighlight?.enabled || settings.outputGrayscale}
              onChange={(event) => updateSelectedHighlightPatch({ outsideGrayscale: event.target.checked })}
            />
            원 바깥 흑백
          </label>
          <button className="small-btn danger" type="button" disabled={!selectedHighlight?.enabled} onClick={() => updateSelectedPhotoHighlight(undefined)}>
            <Trash2 size={15} /> 강조 삭제
          </button>
          <p className="output-help-text compact">
            미리보기 사진 위에서 드래그하면 빨간 원을 만들고, 원 안쪽을 드래그하면 이동, 테두리 근처를 드래그하면 크기를 조절합니다.
          </p>
        </div>
        <div className="output-setting-section">
          <h4>작업 실행</h4>
          <div className="button-row">
            <button className="btn primary" type="button" disabled={isProcessing} onClick={() => void runProcess('selected')}>
              선택 사진 작업
            </button>
            <button className="btn blue" type="button" disabled={isProcessing} onClick={() => void runProcess('checked')}>
              체크 사진 작업
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderPremiumSettingsCard() {
    return (
      <Card title="프리미엄 설정" icon={<Settings size={17} />} className="output-settings-card premium-settings-card">
        <div className="settings-tabs premium-settings-tabs" role="tablist" aria-label="프리미엄 설정">
          <button
            type="button"
            role="tab"
            aria-selected={activeOutputSettingsTab === 'fields'}
            className={activeOutputSettingsTab === 'fields' ? 'settings-tab active' : 'settings-tab'}
            onClick={() => setActiveOutputSettingsTab('fields')}
          >
            보드 내용
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeOutputSettingsTab === 'layout'}
            className={activeOutputSettingsTab === 'layout' ? 'settings-tab active' : 'settings-tab'}
            onClick={() => setActiveOutputSettingsTab('layout')}
          >
            크기/배치
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeOutputSettingsTab === 'typography'}
            className={activeOutputSettingsTab === 'typography' ? 'settings-tab active' : 'settings-tab'}
            onClick={() => setActiveOutputSettingsTab('typography')}
          >
            글자/테두리
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeOutputSettingsTab === 'highlight'}
            className={activeOutputSettingsTab === 'highlight' ? 'settings-tab active' : 'settings-tab'}
            onClick={() => setActiveOutputSettingsTab('highlight')}
          >
            강조/실행
          </button>
        </div>
        <div className="settings-tab-panel output-tab-panel">
          {activeOutputSettingsTab === 'fields' && (
            <div className="premium-field-editor">
              <div className="premium-field-header">
                <span>항목명 / 내용</span>
                <button className="small-btn outline" type="button" onClick={addField}>
                  <Plus size={15} /> 항목 추가
                </button>
              </div>
              {renderBoardFieldEditor('advanced-field-list premium-field-list')}
            </div>
          )}
          {activeOutputSettingsTab === 'layout' && renderBoardLayoutSettings()}
          {activeOutputSettingsTab === 'typography' && renderPremiumTypographySettings()}
          {activeOutputSettingsTab === 'highlight' && renderPremiumHighlightAndActions()}
        </div>
      </Card>
    );
  }

  function renderAdvancedScreen() {
    return (
      <main className="page-shell advanced-shell">
        <div className="advanced-grid">
          <div className="advanced-left">
            <Card title="사진/출력 폴더 설정" icon={<FolderOpen size={17} />} className="advanced-folder-card">
              <div className="compact-row">
                <label>원본 사진</label>
                <input value={photos[0] ? trimPath(photos[0].path) : '사진을 불러오세요'} readOnly />
                <button type="button" onClick={handleSelectPhotos}>
                  선택
                </button>
              </div>
              <div className="compact-row">
                <label>결과 저장</label>
                <input value={saveDir ? trimPath(saveDir) : '저장 경로를 지정하세요'} readOnly />
                <button type="button" onClick={handleSelectSaveFolder}>
                  선택
                </button>
              </div>
              <div className="button-row advanced-folder-actions">
                <button className="small-btn outline" type="button" onClick={handleSelectPhotoFolder}>
                  <FolderOpen size={15} /> 폴더 불러오기
                </button>
                <button className="small-btn outline" type="button" onClick={handleOpenSaveFolder}>
                  결과 폴더 열기
                </button>
              </div>
            </Card>

            <Card
              title={`불러온 사진 ${photos.length}장`}
              icon={<ListChecks size={17} />}
              className="photo-list-card"
              action={
                <div className="photo-card-actions">
                  <button type="button" onClick={() => setAllPhotoChecks(true)}>
                    전체 선택
                  </button>
                  <button type="button" onClick={() => setAllPhotoChecks(false)}>
                    전체 해제
                  </button>
                  <button type="button" onClick={invertPhotoChecks}>
                    선택 반전
                  </button>
                </div>
              }
            >
              <div className="photo-list">
                <div className="photo-list-head">
                  <span>보드</span>
                  <span>파일명</span>
                </div>
                <div className="photo-list-body">
                  {photos.length === 0 ? (
                    <div className="empty-list">사진이 없습니다.</div>
                  ) : (
                    photos.map((photo) => (
                      <div
                        key={photo.path}
                        className={selectedPhotoPath === photo.path ? 'photo-list-row active' : 'photo-list-row'}
                        onClick={() => setSelectedPhotoPath(photo.path)}
                      >
                        <input
                          type="checkbox"
                          checked={photo.selectedForProcessing}
                          onChange={() => togglePhotoChecked(photo.path)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <span title={photo.name}>{photo.name}</span>
                        <button
                          type="button"
                          aria-label="사진 삭제"
                          onClick={(event) => {
                            event.stopPropagation();
                            removePhoto(photo.path);
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <button className="text-action danger-text" type="button" onClick={handleClearPhotos}>
                <RotateCcw size={15} /> 목록 초기화
              </button>
            </Card>

            <Card
              title="보드판 항목/입력값"
              icon={<CheckSquare size={17} />}
              action={<button onClick={addField}>+ 항목 추가</button>}
              className="advanced-field-card"
            >
              {renderBoardFieldEditor()}
            </Card>

            {renderAdvancedActionCard()}
          </div>

          <div className="advanced-right">
            <Card
              title="미리보기"
              icon={<Eye size={17} />}
              action={
                <div className="preview-card-actions">
                  <span className="ratio-label">비율: 100%</span>
                  <button className="small-btn outline" type="button" disabled={!selectedPhoto} onClick={() => void handleCopyPreviewImage()}>
                    <Copy size={15} /> 결과 이미지 복사
                  </button>
                </div>
              }
              className="advanced-preview-card"
            >
              <PreviewStage
                imageDataUrl={previewDataUrl}
                fields={previewFields}
                settings={settings}
                previewRevision={previewRevision}
                livePreviewSignature={livePreviewSignature}
                selectedPhotoName={selectedPhoto?.name}
                emptyText="왼쪽 목록에서 미리보기할 사진을 선택하세요"
                highlight={selectedHighlight}
                outputGrayscale={settings.outputGrayscale}
                large
              />
            </Card>

            <div className="advanced-settings-grid">
              {renderIntegratedSettingsCard()}
            </div>
          </div>
        </div>
      </main>
    );
  }

  function renderOutputScreen() {
    return (
      <main className="page-shell output-shell">
        <div className="output-grid">
          <Card
            title={`사진별 강조 ${photos.length}장`}
            icon={<ListChecks size={17} />}
            className="output-photo-card"
            action={
              <button className="small-btn outline" type="button" onClick={() => setShowPhotoList(true)}>
                자세히
              </button>
            }
          >
            <div className="photo-list output-photo-list">
              <div className="photo-list-head">
                <span>강조</span>
                <span>파일명</span>
              </div>
              <div className="photo-list-body">
                {photos.length === 0 ? (
                  <div className="empty-list">사진이 없습니다.</div>
                ) : (
                  photos.map((photo) => (
                    <div
                      key={photo.path}
                      className={selectedPhotoPath === photo.path ? 'photo-list-row active' : 'photo-list-row'}
                      onClick={() => setSelectedPhotoPath(photo.path)}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(photo.highlight?.enabled)}
                        onChange={(event) => {
                          event.stopPropagation();
                          if (photo.highlight?.enabled) {
                            setPhotos((current) => current.map((item) => (item.path === photo.path ? { ...item, highlight: undefined } : item)));
                          } else {
                            setPhotos((current) =>
                              current.map((item) => (item.path === photo.path ? { ...item, highlight: defaultHighlight } : item))
                            );
                          }
                          refreshPreview();
                        }}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <span title={photo.name}>{photo.name}</span>
                      <button
                        type="button"
                        aria-label="강조 삭제"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPhotos((current) => current.map((item) => (item.path === photo.path ? { ...item, highlight: undefined } : item)));
                          refreshPreview();
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="output-photo-actions">
              <button className="btn ghost wide" type="button" onClick={handleSelectPhotos}>
                <Camera size={17} /> 사진 불러오기
              </button>
              <button className="btn ghost wide" type="button" onClick={handleSelectSaveFolder}>
                <Save size={17} /> 저장 경로 지정
              </button>
            </div>
          </Card>

          <Card
            title="강조 미리보기"
            icon={<Eye size={17} />}
            action={
              <button className="small-btn outline" type="button" disabled={!selectedPhoto} onClick={() => void handleCopyPreviewImage()}>
                <Copy size={15} /> 결과 이미지 복사
              </button>
            }
            className="output-preview-card"
          >
            <PreviewStage
              imageDataUrl={previewDataUrl}
              fields={previewFields}
              settings={settings}
              previewRevision={previewRevision}
              livePreviewSignature={livePreviewSignature}
              selectedPhotoName={selectedPhoto?.name}
              emptyText="왼쪽 목록에서 강조할 사진을 선택하세요"
              highlight={selectedHighlight}
              outputGrayscale={settings.outputGrayscale}
              editableHighlight
              onHighlightChange={updateSelectedPhotoHighlight}
              large
            />
          </Card>

          {renderPremiumSettingsCard()}
        </div>
      </main>
    );
  }

  function setTimeMode(mode: TimeMode) {
    setTimeOptions((current) => ({ ...current, mode }));
  }

  function renderContactScreen() {
    return (
      <main className="page-shell contact-shell">
        <section className="contact-card">
          <h1>문의하기</h1>
          <p>프로그램 개발 및 현장의 반복업무 자동화 문의</p>
          <a href="mailto:hamori4919@naver.com">hamori4919@naver.com</a>
        </section>
      </main>
    );
  }

  function renderAdminScreen() {
    return (
      <main className="page-shell admin-shell">
        <Panel
          title="관리자"
          actions={
            <button type="button" className="secondary-button small" onClick={refreshAdminRows} disabled={adminBusy}>
              <RefreshCw size={16} aria-hidden />
              새로고침
            </button>
          }
        >
          <div className="admin-summary">
            <div>
              <strong>{adminRows.length}</strong>
              <span>사용자</span>
            </div>
            <div>
              <strong>{adminRows.filter((row) => row.profile.role === 'admin').length}</strong>
              <span>관리자</span>
            </div>
            <div>
              <strong>{adminRows.filter((row) => row.subscription?.status === 'manual_active' || row.subscription?.status === 'active').length}</strong>
              <span>활성 구독</span>
            </div>
          </div>
          <div className="admin-oauth-link">
            <div>
              <strong>소셜 계정 연결</strong>
              <span>기존 관리자 이메일 계정에 소셜 로그인을 추가합니다.</span>
            </div>
            <div className="admin-oauth-actions">
              {visibleSocialAuthProviders.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  className={`admin-oauth-button ${provider.id}`}
                  onClick={() => void handleSocialIdentityLink(provider.id)}
                  disabled={authBusy}
                >
                  {oauthBusyProvider === provider.id ? '연결 중...' : `${provider.badge} 연결`}
                </button>
              ))}
            </div>
          </div>
          {adminError && <div className="admin-error">{adminError}</div>}
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>사용자</th>
                  <th>역할</th>
                  <th>계정</th>
                  <th>구독</th>
                  <th>만료일</th>
                  <th>기기</th>
                  <th>최근 접속</th>
                </tr>
              </thead>
              <tbody>
                {adminRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-empty">
                      {adminBusy ? '사용자 정보를 불러오는 중입니다.' : '조회된 사용자가 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  adminRows.map((row) => (
                    <tr key={row.profile.id}>
                      <td>
                        <strong>{row.profile.email}</strong>
                        <small>{[row.profile.display_name, row.profile.company].filter(Boolean).join(' / ') || '프로필 정보 없음'}</small>
                      </td>
                      <td>
                        <select
                          value={row.profile.role}
                          onChange={(event) => void handleAdminRoleChange(row.profile.id, event.currentTarget.value as UserRole)}
                          disabled={adminBusy || row.profile.email === INITIAL_ADMIN_EMAIL}
                        >
                          {roleOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.profile.status}
                          onChange={(event) =>
                            void handleAdminAccountStatusChange(row.profile.id, event.currentTarget.value as AccountStatus)
                          }
                          disabled={adminBusy || row.profile.email === INITIAL_ADMIN_EMAIL}
                        >
                          {accountStatusOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.subscription?.status ?? 'canceled'}
                          onChange={(event) =>
                            void handleAdminSubscriptionStatusChange(row.profile.id, event.currentTarget.value as SubscriptionStatus)
                          }
                          disabled={adminBusy || !row.subscription}
                        >
                          {subscriptionStatusOptions.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="date"
                          value={toDateInputValue(row.subscription?.current_period_end)}
                          onChange={(event) => void handleAdminSubscriptionEndChange(row.profile.id, event.currentTarget.value)}
                          disabled={adminBusy || !row.subscription}
                        />
                      </td>
                      <td>
                        <div className="admin-device-list">
                          {row.devices.length === 0 ? (
                            <small>등록 기기 없음</small>
                          ) : (
                            row.devices.map((device) => (
                              <div key={device.id} className={device.revoked_at ? 'admin-device revoked' : 'admin-device'}>
                                <Monitor size={14} aria-hidden />
                                <span>{device.device_name}</span>
                                {device.revoked_at ? (
                                  <small>해제됨</small>
                                ) : (
                                  <button
                                    type="button"
                                    className="text-danger-button"
                                    onClick={() => void handleAdminDeviceRevoke(row.profile.id, device.id)}
                                    disabled={adminBusy}
                                  >
                                    해제
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td>{formatDateTime(row.profile.last_seen_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </main>
    );
  }

  if (authState.status !== 'ready') {
    return (
      <div className="app auth-only">
        {renderAuthScreen()}
        {updateStatus && <UpdateOverlay status={updateStatus} />}
      </div>
    );
  }

  return (
    <div
      className={isDragTargetActive ? 'app drag-active' : 'app'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {renderTopNavigation()}
      {activeScreen === 'help' && renderHelpScreen()}
      {activeScreen === 'basic' && renderBasicScreen()}
      {activeScreen === 'advanced' && renderAdvancedScreen()}
      {activeScreen === 'output' && renderOutputScreen()}
      {activeScreen === 'commonSettings' && renderCommonSettingsScreen()}
      {activeScreen === 'contact' && renderContactScreen()}
      {activeScreen === 'admin' && isAdmin && renderAdminScreen()}
      {renderStatus()}
      {showPhotoList && (
        <Modal title="불러온 사진 목록" onClose={() => setShowPhotoList(false)}>
          <div className="modal-list">
            {photos.length === 0 ? (
              <p className="empty-line">불러온 사진이 없습니다.</p>
            ) : (
              photos.map((photo) => (
                <button
                  key={photo.path}
                  type="button"
                  className={selectedPhotoPath === photo.path ? 'modal-list-row active' : 'modal-list-row'}
                  onClick={() => {
                    setSelectedPhotoPath(photo.path);
                    setShowPhotoList(false);
                  }}
                >
                  <ImageIcon size={16} />
                  <span>{photo.name}</span>
                  <small>{photo.path}</small>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}
      {showLargePreview && (
        <Modal title="미리보기 큰 화면" onClose={() => setShowLargePreview(false)} wide>
          <div className="modal-toolbar">
            <button className="small-btn outline" type="button" disabled={!selectedPhoto} onClick={() => void handleCopyPreviewImage()}>
              <Copy size={15} /> 결과 이미지 복사
            </button>
          </div>
          <PreviewStage
            imageDataUrl={previewDataUrl}
            fields={previewFields}
            settings={settings}
            previewRevision={previewRevision}
            livePreviewSignature={livePreviewSignature}
            selectedPhotoName={selectedPhoto?.name}
            emptyText="왼쪽 목록에서 미리보기할 사진을 선택하세요"
            highlight={selectedHighlight}
            outputGrayscale={settings.outputGrayscale}
            large
          />
        </Modal>
      )}
      {updateStatus && <UpdateOverlay status={updateStatus} />}
    </div>
  );
}

function getOAuthRedirectTo() {
  return getNativeBridge()?.openOAuthUrl ? oauthRedirectUrl : `${window.location.origin}/auth/callback`;
}

function getNativeBridge() {
  return Reflect.get(window, 'constructView') as Partial<Window['constructView']> | undefined;
}

function hasOAuthCallbackParams(value: string) {
  try {
    const url = new URL(value);
    const params = new URLSearchParams(url.search);
    if (url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      hashParams.forEach((paramValue, key) => params.set(key, paramValue));
    }
    return Boolean(params.get('code') || params.get('access_token') || params.get('error'));
  } catch {
    return false;
  }
}

function ensureAuthSessionStart() {
  if (!window.localStorage.getItem(authSessionStartedAtKey)) {
    window.localStorage.setItem(authSessionStartedAtKey, String(Date.now()));
  }
}

function isStoredAuthSessionExpired() {
  const rawValue = window.localStorage.getItem(authSessionStartedAtKey);
  if (!rawValue) return false;
  const startedAt = Number(rawValue);
  return Number.isFinite(startedAt) && Date.now() - startedAt > authSessionMaxAgeMs;
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function toUiError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return String(error ?? '알 수 없는 오류가 발생했습니다.');
}

function toAuthUiError(error: unknown, mode: AuthMode) {
  const message = toUiError(error);
  if (mode === 'signup' && isAlreadyRegisteredError(error)) {
    return '이미 가입된 이메일입니다. 로그인으로 진행하세요.';
  }
  if (/invalid login credentials/i.test(message)) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (/email not confirmed/i.test(message)) {
    return '이메일 확인이 필요한 계정입니다. 메일함을 확인한 뒤 로그인하세요.';
  }
  return message;
}

function toSocialAuthUiError(error: unknown, provider: SocialAuthProvider) {
  const message = toUiError(error);
  if (/unsupported provider|provider is not enabled|validation_failed/i.test(message)) {
    return `${getSocialProviderName(provider)} 로그인이 Supabase에서 아직 활성화되지 않았습니다. Supabase Dashboard > Authentication > Sign In / Providers에서 해당 Provider를 켠 뒤 Client ID/Secret과 Redirect URL을 등록하세요. 지금은 이메일 로그인/회원가입을 사용할 수 있습니다.`;
  }
  return message;
}

function getSocialProviderName(provider: SocialAuthProvider) {
  switch (provider) {
    case 'google':
      return 'Google';
    case 'kakao':
      return '카카오';
    case 'naver':
      return '네이버';
    default:
      return '소셜';
  }
}

function isAlreadyRegisteredError(error: unknown) {
  return /already registered/i.test(toUiError(error));
}

async function getAuthDeviceIdentity() {
  if (window.constructView?.getDeviceIdentity) {
    return { ...(await window.constructView.getDeviceIdentity()), skipDeviceClaim: false };
  }

  return {
    ok: true,
    fingerprint: await sha256Hex(`browser-preview|${navigator.userAgent}|${navigator.language}|${location.origin}`),
    deviceName: '브라우저 미리보기',
    appVersion: 'preview',
    skipDeviceClaim: true
  };
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function formatProfileName(profile: AuthGateState['profile']) {
  const displayName = profile?.display_name?.trim();
  return displayName || profile?.email || INITIAL_ADMIN_EMAIL;
}

function Panel({
  title,
  actions,
  children,
  className = ''
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <h2>{title}</h2>
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function Card({
  title,
  icon,
  action,
  children,
  className = ''
}: {
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      <div className="card-header">
        <h3>
          {icon}
          {title}
        </h3>
        {action && <div className="card-action">{action}</div>}
      </div>
      {children}
    </section>
  );
}

function SliderRow({
  label,
  min,
  max,
  value,
  suffix,
  onChange
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="slider-row">
      <label>{label}</label>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      {suffix && <span>{value}{suffix}</span>}
    </div>
  );
}

function ColorSelectRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: BoardTextColor;
  onChange: (value: BoardTextColor) => void;
}) {
  return (
    <div className="color-select-row">
      <label>{label}</label>
      <div className="color-options">
        {boardTextColorOptions.map(([optionValue, optionLabel]) => (
          <label key={optionValue} className={`color-option ${optionValue}`}>
            <input
              type="radio"
              name={`${label}-color`}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            <span aria-hidden />
            {optionLabel}
          </label>
        ))}
      </div>
    </div>
  );
}

function RadioGroup({
  label,
  name,
  value,
  options,
  onChange
}: {
  label: string;
  name: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="radio-group">
      <span>{label}</span>
      <div>
        {options.map(([optionValue, optionLabel]) => (
          <label key={optionValue}>
            <input
              type="radio"
              name={name}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            {optionLabel}
          </label>
        ))}
      </div>
    </div>
  );
}

function TimeModeRadio({
  label,
  value,
  current,
  onChange
}: {
  label: string;
  value: TimeMode;
  current: TimeMode;
  onChange: (value: TimeMode) => void;
}) {
  return (
    <label>
      <input type="radio" name="time-mode" checked={current === value} onChange={() => onChange(value)} />
      {label}
    </label>
  );
}

function BoardFieldTable({
  fields,
  selectedFieldId,
  onSelect,
  onUpdate
}: {
  fields: BoardField[];
  selectedFieldId: string;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<BoardField>) => void;
}) {
  return (
    <div className="field-table">
      {fields.map((field) => (
        <div
          key={field.id}
          className={selectedFieldId === field.id ? 'field-row active' : 'field-row'}
          onClick={() => onSelect(field.id)}
        >
          <input
            className="field-label-input"
            value={field.label}
            onInput={(event) => onUpdate(field.id, { label: event.currentTarget.value })}
          />
          {field.label === '내용' || field.value.length > 80 ? (
            <textarea value={field.value} onInput={(event) => onUpdate(field.id, { value: event.currentTarget.value })} />
          ) : (
            <input value={field.value} onInput={(event) => onUpdate(field.id, { value: event.currentTarget.value })} />
          )}
        </div>
      ))}
    </div>
  );
}

function PreviewStage({
  imageDataUrl,
  fields,
  settings,
  previewRevision,
  livePreviewSignature,
  selectedPhotoName,
  emptyText,
  highlight,
  outputGrayscale = false,
  editableHighlight = false,
  onHighlightChange,
  large = false
}: {
  imageDataUrl: string;
  fields: BoardField[];
  settings: BoardSettings;
  previewRevision: number;
  livePreviewSignature: string;
  selectedPhotoName?: string;
  emptyText: string;
  highlight?: PhotoHighlight;
  outputGrayscale?: boolean;
  editableHighlight?: boolean;
  onHighlightChange?: (highlight: PhotoHighlight | undefined) => void;
  large?: boolean;
}) {
  const [loadedImage, setLoadedImage] = useState<{ src: string; width: number; height: number } | null>(null);
  const [stageSize, setStageSize] = useState<{ width: number; height: number } | null>(null);
  const [highlightDrag, setHighlightDrag] = useState<{
    mode: 'create' | 'move' | 'resize';
    startX: number;
    startY: number;
    startHighlight: PhotoHighlight;
  } | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  function syncStageSize(element: HTMLDivElement | null) {
    if (!element) return;
    const width = Math.floor(element.clientWidth);
    const height = Math.floor(element.clientHeight);
    if (width <= 0 || height <= 0) return;
    setStageSize((current) =>
      current?.width === width && current?.height === height ? current : { width, height }
    );
  }

  function syncImageSize(image: HTMLImageElement | null) {
    if (!image?.naturalWidth || !image.naturalHeight) return;
    const src = image.currentSrc || image.src;
    if (src !== imageDataUrl) return;
    setLoadedImage((current) =>
      current?.src === src && current.width === image.naturalWidth && current.height === image.naturalHeight
        ? current
        : { src, width: image.naturalWidth, height: image.naturalHeight }
    );
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    syncStageSize(stage);

    const observer = new ResizeObserver(() => {
      syncStageSize(stage);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLoadedImage(null);
  }, [imageDataUrl]);

  useEffect(() => {
    if (!imageDataUrl) return;
    syncImageSize(imageRef.current);
  }, [imageDataUrl, livePreviewSignature, previewRevision]);

  const imageSize = loadedImage?.src === imageDataUrl
    ? { width: loadedImage.width, height: loadedImage.height }
    : null;

  const boardPreview = useMemo(() => {
    if (!imageSize) return null;

    const board = buildBoardSvg(imageSize.width, imageSize.height, fields, settings);
    const position = calculateBoardPosition(imageSize.width, imageSize.height, board.width, board.height, settings);
    const style: React.CSSProperties = {
      width: `${(board.width / imageSize.width) * 100}%`,
      height: `${(board.height / imageSize.height) * 100}%`
    };

    if (settings.position.endsWith('right')) {
      style.right = 0;
    } else {
      style.left = `${(position.left / imageSize.width) * 100}%`;
    }

    if (settings.position.startsWith('bottom')) {
      style.bottom = 0;
    } else {
      style.top = `${(position.top / imageSize.height) * 100}%`;
    }

    return {
      svg: board.svg,
      key: `${board.width}x${board.height}:${position.left}:${position.top}:${previewRevision}:${hashString(livePreviewSignature)}:${hashString(board.svg)}`,
      style
    };
  }, [fields, imageSize, livePreviewSignature, previewRevision, settings]);

  const containedSize = useMemo(() => calculateContainedSize(imageSize, stageSize), [imageSize, stageSize]);
  const activeHighlight = highlight?.enabled ? highlight : undefined;
  const highlightCircle = useMemo(() => {
    if (!activeHighlight || !containedSize) return null;
    return resolveHighlightCircle(containedSize.width, containedSize.height, activeHighlight);
  }, [activeHighlight, containedSize]);
  const showOutsideGrayscale = Boolean(activeHighlight?.outsideGrayscale && !outputGrayscale && highlightCircle);
  const imageShellStyle = useMemo(() => {
    if (!containedSize) return undefined;

    return {
      width: `${containedSize.width}px`,
      height: `${containedSize.height}px`
    } satisfies React.CSSProperties;
  }, [containedSize]);

  function getHighlightPoint(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height)
    };
  }

  function handleHighlightPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!editableHighlight || !onHighlightChange || !containedSize || !imageDataUrl) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getHighlightPoint(event);
    const radiusBase = Math.min(containedSize.width, containedSize.height);
    let mode: 'create' | 'move' | 'resize' = 'create';
    let startHighlight = activeHighlight ?? {
      ...defaultHighlight,
      xRatio: point.x / containedSize.width,
      yRatio: point.y / containedSize.height,
      radiusRatio: 0.02
    };

    if (highlightCircle && activeHighlight) {
      const distance = Math.hypot(point.x - highlightCircle.x, point.y - highlightCircle.y);
      if (Math.abs(distance - highlightCircle.radius) <= 14) {
        mode = 'resize';
      } else if (distance <= highlightCircle.radius) {
        mode = 'move';
      } else {
        mode = 'create';
        startHighlight = {
          ...activeHighlight,
          enabled: true,
          xRatio: point.x / containedSize.width,
          yRatio: point.y / containedSize.height,
          radiusRatio: Math.max(0.02, Math.min(0.35, distance / radiusBase))
        };
      }
    }

    setHighlightDrag({ mode, startX: point.x, startY: point.y, startHighlight });
    onHighlightChange(clampHighlight(startHighlight));
  }

  function handleHighlightPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!highlightDrag || !onHighlightChange || !containedSize) return;
    event.preventDefault();
    const point = getHighlightPoint(event);
    const radiusBase = Math.min(containedSize.width, containedSize.height);
    let nextHighlight: PhotoHighlight;

    if (highlightDrag.mode === 'move') {
      nextHighlight = {
        ...highlightDrag.startHighlight,
        xRatio: highlightDrag.startHighlight.xRatio + (point.x - highlightDrag.startX) / containedSize.width,
        yRatio: highlightDrag.startHighlight.yRatio + (point.y - highlightDrag.startY) / containedSize.height
      };
    } else {
      const centerX = highlightDrag.mode === 'create'
        ? highlightDrag.startX
        : highlightDrag.startHighlight.xRatio * containedSize.width;
      const centerY = highlightDrag.mode === 'create'
        ? highlightDrag.startY
        : highlightDrag.startHighlight.yRatio * containedSize.height;
      nextHighlight = {
        ...highlightDrag.startHighlight,
        xRatio: centerX / containedSize.width,
        yRatio: centerY / containedSize.height,
        radiusRatio: Math.hypot(point.x - centerX, point.y - centerY) / radiusBase
      };
    }

    onHighlightChange(clampHighlight(nextHighlight));
  }

  function handleHighlightPointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (!highlightDrag) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setHighlightDrag(null);
  }

  return (
    <div ref={stageRef} className={large ? 'preview-stage large' : 'preview-stage'}>
      {imageDataUrl ? (
        <div
          className={editableHighlight ? 'preview-image-shell editable-highlight' : 'preview-image-shell'}
          style={imageShellStyle}
          onPointerDown={handleHighlightPointerDown}
          onPointerMove={handleHighlightPointerMove}
          onPointerUp={handleHighlightPointerEnd}
          onPointerCancel={handleHighlightPointerEnd}
        >
          <img
            ref={imageRef}
            src={imageDataUrl}
            alt={selectedPhotoName ?? '미리보기 사진'}
            className={outputGrayscale || showOutsideGrayscale ? 'preview-image-grayscale' : undefined}
            onLoad={(event) => {
              syncImageSize(event.currentTarget);
            }}
          />
          {showOutsideGrayscale && highlightCircle && (
            <img
              src={imageDataUrl}
              alt=""
              aria-hidden
              className="preview-highlight-color-restore"
              style={{
                clipPath: `circle(${highlightCircle.radius}px at ${highlightCircle.x}px ${highlightCircle.y}px)`
              }}
            />
          )}
          {highlightCircle && (
            <div
              className="preview-highlight-circle"
              aria-hidden
              style={{
                left: `${highlightCircle.x - highlightCircle.radius}px`,
                top: `${highlightCircle.y - highlightCircle.radius}px`,
                width: `${highlightCircle.radius * 2}px`,
                height: `${highlightCircle.radius * 2}px`
              }}
            >
              <span />
            </div>
          )}
          {boardPreview && (
            <div
              key={boardPreview.key}
              className="board-overlay-svg"
              style={boardPreview.style}
              aria-hidden
              dangerouslySetInnerHTML={{ __html: boardPreview.svg }}
            />
          )}
        </div>
      ) : (
        <div className="preview-placeholder">
          <ImageIcon size={42} />
          <span>{emptyText}</span>
        </div>
      )}
    </div>
  );
}

function clampHighlight(highlight: PhotoHighlight): PhotoHighlight {
  return {
    ...highlight,
    enabled: true,
    xRatio: clamp(highlight.xRatio, 0, 1),
    yRatio: clamp(highlight.yRatio, 0, 1),
    radiusRatio: clamp(highlight.radiusRatio, 0.02, 1)
  };
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash.toString(36);
}

function Modal({
  title,
  children,
  onClose,
  wide = false
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className={wide ? 'modal wide' : 'modal'}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

const updatePhaseMessages: Record<UpdateStatusPayload['phase'], string> = {
  checking: '업데이트 확인 중',
  available: '새 업데이트를 준비하고 있습니다.',
  downloading: '업데이트 파일 다운로드 중',
  verifying: '업데이트 파일 검증 중',
  installing: '업데이트 설치를 시작합니다.',
  failed: '업데이트 설치를 완료하지 못했습니다.'
};

function UpdateOverlay({ status }: { status: UpdateStatusPayload }) {
  const percent = typeof status.percent === 'number' ? clamp(Math.round(status.percent), 0, 100) : null;
  const progressValue = percent ?? (status.phase === 'available' ? 6 : 14);
  const detail = status.error
    ? status.error
    : status.phase === 'downloading'
      ? formatUpdateDownloadDetail(status)
      : status.version
        ? `버전 ${status.version}`
        : '';

  return (
    <div className="update-overlay" role="alertdialog" aria-modal="true" aria-labelledby="update-title">
      <div className="update-dialog">
        <div className={status.phase === 'failed' ? 'update-icon failed' : 'update-icon'}>
          <RefreshCw size={24} />
        </div>
        <div className="update-copy">
          <h2 id="update-title">업데이트 진행 중</h2>
          <p>{status.message ?? updatePhaseMessages[status.phase]}</p>
          {detail && <small>{detail}</small>}
        </div>
        <div className="update-progress" style={{ '--progress': `${progressValue}%` } as React.CSSProperties}>
          <span />
        </div>
        <div className="update-progress-label">
          <span>{updatePhaseMessages[status.phase]}</span>
          {percent !== null && <strong>{percent}%</strong>}
        </div>
      </div>
    </div>
  );
}

function formatUpdateDownloadDetail(status: UpdateStatusPayload) {
  if (!status.downloadedBytes || !status.totalBytes) {
    return status.version ? `버전 ${status.version}` : '';
  }

  return `${formatBytes(status.downloadedBytes)} / ${formatBytes(status.totalBytes)}`;
}

function formatBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)} KB`;
  }

  return `${value} B`;
}

function applyTimeMode(
  fields: BoardField[],
  photo: PhotoItem | undefined,
  photoIndex: number,
  timeOptions: TimeOptions,
  exifMap: DateTimeMap
) {
  let dateTime: DateTimeValue | undefined;

  if (timeOptions.mode === 'exif' && photo) {
    dateTime = exifMap[photo.path] ?? exifMap[normalizeFileName(photo.name)];
  } else if (timeOptions.mode === 'sequence') {
    dateTime = calculateSequenceDateTime(photoIndex, timeOptions);
  } else if (timeOptions.mode === 'sheet' && photo) {
    dateTime = timeOptions.sheetMap?.[normalizeFileName(photo.name)] ?? timeOptions.sheetMap?.[photo.name];
  }

  if (!dateTime) {
    return fields;
  }

  return fields.map((field) => {
    if (field.label.includes('날짜')) return { ...field, value: dateTime.date || field.value };
    if (field.label.includes('시간')) return { ...field, value: dateTime.time || field.value };
    return field;
  });
}

function calculateSequenceDateTime(photoIndex: number, timeOptions: TimeOptions): DateTimeValue | undefined {
  if (photoIndex < 0 || !timeOptions.sequenceStartDate || !timeOptions.sequenceStartTime) return undefined;
  const [year, month, day] = timeOptions.sequenceStartDate.split('-').map(Number);
  const [hour, minute] = timeOptions.sequenceStartTime.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return undefined;
  const date = new Date(year, month - 1, day, hour, minute);
  date.setMinutes(date.getMinutes() + photoIndex * Math.max(0, timeOptions.sequenceIntervalMinutes));
  return { date: formatBoardDate(date), time: `${pad2(date.getHours())}:${pad2(date.getMinutes())}` };
}

function formatBoardDate(date: Date) {
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

function normalizeFileName(fileName: string) {
  return fileName.trim().toLowerCase();
}

function normalizeColumnRatios(settings: BoardSettings) {
  let labelColumnWidthRatio = Number.isFinite(settings.labelColumnWidthRatio)
    ? Number(settings.labelColumnWidthRatio)
    : DEFAULT_LABEL_COLUMN_WIDTH_RATIO;
  let valueColumnWidthRatio = Number.isFinite(settings.valueColumnWidthRatio)
    ? Number(settings.valueColumnWidthRatio)
    : DEFAULT_VALUE_COLUMN_WIDTH_RATIO;

  labelColumnWidthRatio = clamp(labelColumnWidthRatio, MIN_LABEL_COLUMN_WIDTH_RATIO, MAX_LABEL_COLUMN_WIDTH_RATIO);
  valueColumnWidthRatio = clamp(valueColumnWidthRatio, MIN_VALUE_COLUMN_WIDTH_RATIO, MAX_VALUE_COLUMN_WIDTH_RATIO);

  let widthRatio = labelColumnWidthRatio + valueColumnWidthRatio;
  if (widthRatio < MIN_BOARD_WIDTH_RATIO) {
    valueColumnWidthRatio += MIN_BOARD_WIDTH_RATIO - widthRatio;
    widthRatio = MIN_BOARD_WIDTH_RATIO;
  }
  if (widthRatio > MAX_BOARD_WIDTH_RATIO) {
    const scale = MAX_BOARD_WIDTH_RATIO / widthRatio;
    labelColumnWidthRatio *= scale;
    valueColumnWidthRatio *= scale;
    widthRatio = MAX_BOARD_WIDTH_RATIO;
  }

  return {
    labelColumnWidthRatio: Number(labelColumnWidthRatio.toFixed(3)),
    valueColumnWidthRatio: Number(valueColumnWidthRatio.toFixed(3)),
    widthRatio: Number(clampBoardWidthRatio(widthRatio).toFixed(3))
  };
}

function trimPath(value: string) {
  if (value.length <= 44) return value;
  return `${value.slice(0, 18)}...${value.slice(-23)}`;
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
