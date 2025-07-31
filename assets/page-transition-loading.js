(function() {
  var loaded = false;
  var domReady = false;

  function hideLoading() {
      if (loaded && domReady) {
          document.body.classList.add('loaded');
      }
  }
  window.addEventListener('load', function() {
      loaded = true;
      hideLoading();
  });
  document.addEventListener('DOMContentLoaded', function() {
      domReady = true;
      hideLoading();
  });

  setTimeout(function() {
      if (!loaded) {
          loaded = true;
          hideLoading();
      }
  }, 800);
})();