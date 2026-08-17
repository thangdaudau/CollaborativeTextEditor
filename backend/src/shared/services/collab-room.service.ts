export type ResetRoomFn = (
  docId: string,
  reason?: string,
  closeCode?: number
) => Promise<void>;

export type GetDocStateFn = (docId: string) => Uint8Array | null;

let resetRoomHandler: ResetRoomFn | null = null;
let getDocStateHandler: GetDocStateFn | null = null;

// Hàm để module collaboration đăng ký xử lý thực tế
export const registerRoomResetHandler = (handler: ResetRoomFn) => {
  resetRoomHandler = handler;
};

export const registerGetDocStateHandler = (handler: GetDocStateFn) => {
  getDocStateHandler = handler;
};

// Hàm dùng chung cho tất cả các module khác gọi
export const resetCollabRoom = async (
  docId: string,
  reason: string = 'PERMISSIONS_CHANGED',
  closeCode: number = 4003
) => {
  if (resetRoomHandler) {
    await resetRoomHandler(docId, reason, closeCode);
  }
};

export const getCollabDocState = (docId: string): Uint8Array | null => {
  return getDocStateHandler ? getDocStateHandler(docId) : null;
};