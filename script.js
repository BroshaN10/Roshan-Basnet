const toggle = document.querySelector('.menu-toggle');
const links = document.querySelector('.nav-links');
toggle?.addEventListener('click', () => {
  const isOpen = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(isOpen));
  toggle.textContent = isOpen ? '✕' : '☰';
});
links?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  links.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
  if (toggle) toggle.textContent = '☰';
}));
document.querySelector('#year').textContent = new Date().getFullYear();
