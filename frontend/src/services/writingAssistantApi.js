import api from '../utils/api';

const writingAssistantApi = {
  async sendMessage(projectId, { prompt, selected_text, cursor_paragraph, current_heading, draft_content }) {
    const response = await api.post(`/api/projects/${projectId}/writing-assistant/chat`, {
      prompt,
      selected_text,
      cursor_paragraph,
      current_heading,
      draft_content
    });
    return response.data;
  },

  async getHistory(projectId) {
    const response = await api.get(`/api/projects/${projectId}/writing-assistant/history`);
    return response.data;
  },

  async clearHistory(projectId) {
    const response = await api.delete(`/api/projects/${projectId}/writing-assistant/history`);
    return response.data;
  },

  async updateDocumentType(projectId, documentType) {
    const response = await api.put(`/api/projects/${projectId}/document-type?document_type=${encodeURIComponent(documentType)}`);
    return response.data;
  }
};

export default writingAssistantApi;
