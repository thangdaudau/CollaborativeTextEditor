import { Extension } from '@tiptap/core';
import { yUndoPlugin, undo, redo } from 'y-prosemirror';

export const CollaborationHistory = Extension.create({
  name: 'collaborationHistory',

  addProseMirrorPlugins() {
    return [yUndoPlugin()];
  },

  addKeyboardShortcuts() {
    return {
      'Mod-z': () => undo(this.editor.state),
      'Mod-y': () => redo(this.editor.state),
      'Mod-Shift-z': () => redo(this.editor.state),
    };
  },
});