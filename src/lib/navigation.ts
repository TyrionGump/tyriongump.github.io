// Page changes that script starts go through here, so an in-place page
// changer can take them over. Without one, they are normal page loads.

let navigator = (url: string): void => {
  window.location.assign(url);
};

export function navigateTo(url: string): void {
  navigator(url);
}

export function setNavigator(next: (url: string) => void): void {
  navigator = next;
}
