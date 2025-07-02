import { configureStore } from '@reduxjs/toolkit';
import editorReducer from '../features/editor/editorSlice';

export const store = configureStore({
  reducer: {
    editor: editorReducer,
  },
});
