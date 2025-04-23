export const dialogService = {
  prompt: (message: string): string | null => {
    return window.prompt(message);
  },

  confirm: (message: string): boolean => {
    return window.confirm(message);
  }
}; 