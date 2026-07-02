let activeEditor = null;

const editorBridge = {
  registerEditor(editor) {
    activeEditor = editor;
  },

  unregisterEditor() {
    activeEditor = null;
  },

  isRegistered() {
    return !!activeEditor;
  },

  getDocument() {
    if (!activeEditor) return '';
    return activeEditor.getHTML();
  },

  getSelection() {
    if (!activeEditor) return '';
    const { state } = activeEditor;
    const { from, to } = state.selection;
    if (from === to) return '';
    return state.doc.textBetween(from, to, ' ');
  },

  getCursor() {
    if (!activeEditor) return '';
    const { state } = activeEditor;
    const { $from } = state.selection;
    return $from.parent.textContent || '';
  },

  getCurrentHeading() {
    if (!activeEditor) return '';
    let headingText = '';
    const { state } = activeEditor;
    const { $from } = state.selection;
    
    state.doc.nodesBetween(0, $from.pos, (node) => {
      if (node.type.name === 'heading') {
        headingText = node.textContent;
      }
    });
    return headingText;
  },

  insertContent(content) {
    if (!activeEditor) return;
    activeEditor.chain().focus().insertContent(content).run();
  },

  replaceSelection(content) {
    if (!activeEditor) return;
    activeEditor.chain().focus().insertContent(content).run();
  },

  appendContent(content) {
    if (!activeEditor) return;
    activeEditor.chain().focus().insertContentAt(activeEditor.state.doc.content.size, content).run();
  },

  appendAbove(content) {
    if (!activeEditor) return;
    const { state } = activeEditor;
    const { $from } = state.selection;
    // Insert at start of current block node
    const pos = $from.start($from.depth);
    activeEditor.chain().focus().insertContentAt(pos, content + '<p></p>').run();
  },

  appendBelow(content) {
    if (!activeEditor) return;
    const { state } = activeEditor;
    const { $from } = state.selection;
    // Insert at end of current block node
    const pos = $from.end($from.depth);
    activeEditor.chain().focus().insertContentAt(pos, '<p></p>' + content).run();
  },

  scrollToInsertion() {
    if (!activeEditor) return;
    activeEditor.commands.focus();
  },

  saveDocument() {
    // Find the save button and trigger click to save draft
    const saveBtn = document.querySelector('[title="Save Draft"]') || document.getElementById('save-draft-btn');
    if (saveBtn) {
      saveBtn.click();
    }
  }
};

export default editorBridge;
