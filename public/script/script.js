
// loading
window.addEventListener('load', function() {
  const loadingOverlay = document.getElementById('loadingOverlay');
  setTimeout(function() {
    loadingOverlay.style.display = 'none';
  }, 500);
});

