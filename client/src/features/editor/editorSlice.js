import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  content: '',
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setContent: (state, action) => {
      state.content = action.payload;
    },
  },
});

export const { setContent } = editorSlice.actions;
export default editorSlice.reducer;
