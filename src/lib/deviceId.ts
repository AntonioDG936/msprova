// Generate and persist a unique device ID
export function getDeviceId(): string {
  let id = localStorage.getItem("paestum_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("paestum_device_id", id);
  }
  return id;
}
