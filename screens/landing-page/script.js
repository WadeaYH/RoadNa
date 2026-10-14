// RoadNa JO landing: boots the directed city story. Presentation only; ASP.NET will own data.
const story = document.getElementById('story');
const status = document.getElementById('story-status');

function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function fallback(message) {
  story.classList.remove('is-ready', 'is-scrolly');
  status.textContent = message;
}

if (!webglAvailable()) fallback('The animated city is not available on this device. The full story and every destination are below.');
else {
  import('./city/story.js')
    .then(({ mountStory }) => mountStory())
    .catch((error) => { console.warn('Story fallback:', error); fallback('The animated city could not start. The full story and every destination are below.'); });
}

// Without the 3D story, the "How RoadNa Works" destination still opens its explanation.
document.querySelectorAll('[data-info]').forEach((link) => link.addEventListener('click', (event) => {
  if (story.classList.contains('is-ready')) return;
  event.preventDefault();
  document.getElementById('city-info').showModal();
}));
