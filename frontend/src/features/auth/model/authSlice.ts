import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  getProfileApi,
  loginApi,
  registerApi,
  updateProfileApi,
  uploadProfileAvatarApi,
  type AuthUser,
} from '../api/authApi';

export interface AuthState {
  token: string | null;
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: AuthState = {
  token: localStorage.getItem('token'),
  user: null,
  status: 'idle',
  error: null,
};

function normalizeApiMessage(msg: unknown): string | undefined {
  if (typeof msg === 'string') return msg;
  if (Array.isArray(msg)) {
    return msg.filter((x): x is string => typeof x === 'string').join(', ');
  }
  return undefined;
}

function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const anyErr = error as any;
    const msg =
      normalizeApiMessage(anyErr?.response?.data?.message) ??
      anyErr?.message ??
      anyErr?.toString?.();
    if (typeof msg === 'string') return msg;
  }
  return 'Ошибка авторизации';
}

export const login = createAsyncThunk(
  'auth/login',
  async (payload: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await loginApi(payload);
    } catch (e) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (payload: { email: string; password: string; name: string }, { rejectWithValue }) => {
    try {
      return await registerApi(payload);
    } catch (e) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      return await getProfileApi();
    } catch (e) {
      return rejectWithValue(extractErrorMessage(e));
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (
    payload: {
      name: string;
      selectedFile?: File | null;
      avatarFromForm?: string | null;
    },
    { rejectWithValue },
  ) => {
    try {
      if (payload.selectedFile) {
        await uploadProfileAvatarApi(payload.selectedFile);
      }
      const avatarForPut =
        payload.selectedFile != null
          ? undefined
          : payload.avatarFromForm === '' || payload.avatarFromForm === undefined
            ? undefined
            : payload.avatarFromForm;
      return await updateProfileApi({
        name: payload.name.trim(),
        avatar: avatarForPut,
      });
    } catch (e) {
      return rejectWithValue(extractErrorMessage(e));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
      if (action.payload) localStorage.setItem('token', action.payload);
      else localStorage.removeItem('token');
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.status = 'idle';
      state.error = null;
      localStorage.removeItem('token');
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Ошибка авторизации';
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token);
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Ошибка регистрации';
      })
      .addCase(fetchProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) || 'Не удалось загрузить профиль';
      })
      .addCase(updateProfile.pending, (state) => {
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
        state.error = null;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.error =
          (action.payload as string) || 'Не удалось сохранить профиль';
      });
  },
});

export const { setToken, logout, clearAuthError } = authSlice.actions;
export const authReducer = authSlice.reducer;

