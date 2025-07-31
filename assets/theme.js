function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);


  if (elementToFocus) {
    elementToFocus.focus();
  }

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube:not([data-ignore-pause])').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  });

  document.querySelectorAll('.js-vimeo:not([data-ignore-pause])').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });

  document.querySelectorAll('video:not([data-ignore-pause])').forEach((video) => {
    video.pause();
  });

  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}


function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.target.name === 'plus') {
      if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

    if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};



class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
    this.querySelectorAll(
      'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)'
    ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 150);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    detailsElement.classList.add('is-closing');
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        
        detailsElement.removeAttribute('open');
        detailsElement.classList.remove('is-closing'); 
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);


class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset =
      this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
    );
    this.header.classList.add('menu-open');
    this.mainDetailsToggle.classList.add('is-opening');

    requestAnimationFrame(() => {
      this.mainDetailsToggle.setAttribute('open', '');
      this.mainDetailsToggle.classList.add('menu-opening');
  
      setTimeout(() => {
        this.mainDetailsToggle.classList.remove('is-opening');
      }, 300); 
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
      );
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}

customElements.define('header-drawer', HeaderDrawer);



class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener('click', this.hide.bind(this, false));
    this.handleKeyDown = this.handleKeyDown.bind(this);
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    document.addEventListener('keydown', this.handleKeyDown);
  }
  disconnectedCallback() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(event) {
    if (event.key === 'Escape' && this.hasAttribute('open')) {
      this.hide();
    }
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
  
    // Trap focus within the modal dialog
    setTimeout(() => {
      const firstFocusableElement = this.querySelector('a, input, button, [tabindex]:not([tabindex="-1"])');
      trapFocus(this, firstFocusableElement);
    },300);
    
  }
  

  hide() {
    this.setAttribute("closing", "true"),
    setTimeout(() => {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    this.removeAttribute("closing");
    removeTrapFocus(this.openedBy);
    },300);
  }
}
customElements.define('modal-dialog', ModalDialog);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
      if (deferredElement.nodeName == 'VIDEO' && deferredElement.getAttribute('autoplay')) {
        // force autoplay for safari
        deferredElement.play();
      }
    }
  }
}

customElements.define('deferred-media', DeferredMedia);


class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('change', this.onVariantChange);
  }
  connectedCallback() {
    this.getVariantData();
  }
  onVariantChange(event) {
    this.updateOptions();
    this.updateMasterId();
    this.updateSelectedSwatchValue(event);
    this.toggleAddButton(true, '', false);
    this.toggleStickyAddButton(true, '', false);
    this.updatePickupAvailability();
    this.removeErrorMessage();
    this.updateVariantStatuses();
    this.updateVariantText();
    this.updateSoldOutState();
    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      this.toggleStickyAddButton(true, '', true);
      this.setUnavailable();
    } else {
      this.updateURL();
      this.updateVariantInput();
      this.renderProductInfo();
      this.updateShareUrl();
      this.updateCarousel();
      
    }
  }

  updateCarousel() {
    const updateCarouselForElement = (element) => {
      if (element && this.currentVariant.featured_media) {
        element.updateCarouselImages(this.currentVariant.featured_media.id);
      }
    };
    const galleryCarousel = document.getElementById(`Gallery-carousel-${this.dataset.section}`);
    updateCarouselForElement(galleryCarousel);
    const quickViewContainer = document.querySelector('.product-modal-content');
    if (quickViewContainer) {
      const galleryCarouselQuickView = quickViewContainer.querySelector(`#Gallery-carousel-${this.dataset.section}`);
      updateCarouselForElement(galleryCarouselQuickView);
    }
  }
  
  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select, fieldset'), (element) => {
      if (element.tagName === 'SELECT') {
        return element.value;
      }
      if (element.tagName === 'FIELDSET') {
        return Array.from(element.querySelectorAll('input')).find((radio) => radio.checked)?.value;
      }
    });
  }
  updateVariantText() {
    this.querySelectorAll('.product-form__input').forEach((item, i) => 
      item.querySelector('.form__label-value').innerHTML = this.options[i]
    );
  }
  
  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  updateSelectedSwatchValue({ target }) {
    const { name, value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = this.querySelector(`[data-selected-dropdown-swatch="${name}"] > .swatch`);
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }

      selectedDropdownSwatchValue.style.setProperty(
        '--swatch-focal-point',
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset'
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = this.querySelector(`[data-selected-swatch-value="${name}"]`);
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }


  updateShareUrl() {
    const shareButton = document.getElementById(`Share-${this.dataset.section}`);
    if (!shareButton ) return;
    shareButton.setAttribute('data-url', `${window.shopUrl}${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const productForms = document.querySelectorAll(
      `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}`
    );
    productForms.forEach((productForm) => {
      const input = productForm.querySelector('input[name="id"]');
      input.value = this.currentVariant.id;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  updateVariantStatuses() {
    const selectedOptionOneVariants = this.variantData.filter(
      (variant) => this.querySelector(':checked').value === variant.option1
    );
    const inputWrappers = [...this.querySelectorAll('.product-form__input')];
    inputWrappers.forEach((option, index) => {
      if (index === 0) return;
      const optionInputs = [...option.querySelectorAll('input[type="radio"], option')];
      const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
      const availableOptionInputsValue = selectedOptionOneVariants
        .filter((variant) => variant.available && variant[`option${index}`] === previousOptionSelected)
        .map((variantOption) => variantOption[`option${index + 1}`]);
      this.setInputAvailability(optionInputs, availableOptionInputsValue);
    });
  }

  setInputAvailability(elementList, availableValuesList) {
    elementList.forEach((element) => {
      const value = element.getAttribute('value');
      const availableElement = availableValuesList.includes(value);

      if (element.tagName === 'INPUT') {
        element.classList.toggle('disabled', !availableElement);
      } else if (element.tagName === 'OPTION') {
        element.innerText = availableElement
          ? value
          : window.variantStrings.unavailable_with_option.replace('[value]', value);
      }
    });
  }

  updatePickupAvailability() {
    const pickUpAvailability = document.querySelector('pickup-availability');
   
    if (!pickUpAvailability) return;

    if (this.currentVariant && this.currentVariant.available) {
      pickUpAvailability.fetchAvailability(this.currentVariant.id);
    } else {
      pickUpAvailability.removeAttribute('available');
      pickUpAvailability.innerHTML = '';
    }
  }

  updateSoldOutState() {
    const soldOutMessageElement = document.getElementById(`sold-out-message-${this.dataset.section}`);
    const soldOutVariantNameElement = document.querySelector(`#sold-out-variant-name-${this.dataset.section}`);
    const soldOutSelectElement = document.getElementById(`ContactFormSoldout-select-${this.dataset.section}`);
    
    if (this.currentVariant && !this.currentVariant.available) {
      if (soldOutMessageElement) {
        soldOutMessageElement.classList.remove('hidden');
      }
      if (soldOutVariantNameElement) {
        soldOutVariantNameElement.textContent = this.currentVariant.title;
      }
  
      if (soldOutSelectElement) {
        const selectedVariantId = this.currentVariant.id;
        const options = soldOutSelectElement.querySelectorAll('option');
  
        options.forEach((option) => {
          const optionId = option.getAttribute('option-id');
          if (optionId == selectedVariantId) {
            option.selected = true; 
          }
        });
      }
  
    } else {
      if (soldOutMessageElement) {
        soldOutMessageElement.classList.add('hidden');
      }
      if (soldOutVariantNameElement) {
        soldOutVariantNameElement.textContent = '';
      }
    }
  }

  removeErrorMessage() {
    const section = this.closest('section');
    if (!section) return;

    const productForm = section.querySelector('product-form');
    if (productForm) productForm.handleErrorMessage();
  }
  renderProductInfo() {
    const requestedVariantId = this.currentVariant.id;
    const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;
    

    fetch(
      `${this.dataset.url}?variant=${requestedVariantId}&section_id=${
        this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section
      }`
    )
      .then((response) => response.text())
      .then((responseText) => {
        // prevent unnecessary ui changes from abandoned selections
        if (!this.currentVariant) {
          return;
        }
        if (this.currentVariant.id !== requestedVariantId) return;

        const html = new DOMParser().parseFromString(responseText, 'text/html');
        const destination = document.getElementById(`price-${this.dataset.section}`);
        const source = html.getElementById(
          `price-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const skuSource = html.getElementById(
          `Sku-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const skuDestination = document.getElementById(`Sku-${this.dataset.section}`);
        const inventorySource = html.getElementById(
          `Inventory-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );
        const inventoryDestination = document.getElementById(`Inventory-${this.dataset.section}`);

        const volumePricingSource = html.getElementById(
          `Volume-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );

        this.updateStickyImage(sectionId, html);
        this.updateStickyPrice(sectionId, html);

        const pricePerItemDestination = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
        const pricePerItemSource = html.getElementById(
          `Price-Per-Item-${this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section}`
        );

        const volumePricingDestination = document.getElementById(`Volume-${this.dataset.section}`);
        const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);
        const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`);

        if (volumeNote) volumeNote.classList.remove('hidden');
        if (volumePricingDestination) volumePricingDestination.classList.remove('hidden');
        if (qtyRules) qtyRules.classList.remove('hidden');

        if (source && destination) destination.innerHTML = source.innerHTML;
        if (inventorySource && inventoryDestination) inventoryDestination.innerHTML = inventorySource.innerHTML;
        if (skuSource && skuDestination) {
          skuDestination.innerHTML = skuSource.innerHTML;
          skuDestination.classList.toggle('hidden', skuSource.classList.contains('hidden'));
        }

        if (volumePricingSource && volumePricingDestination) {
          volumePricingDestination.innerHTML = volumePricingSource.innerHTML;
        }

        if (pricePerItemSource && pricePerItemDestination) {
          pricePerItemDestination.innerHTML = pricePerItemSource.innerHTML;
          pricePerItemDestination.classList.toggle('hidden', pricePerItemSource.classList.contains('hidden'));
        }

        const price = document.getElementById(`price-${this.dataset.section}`);
        if (price) price.classList.remove('hidden');

        if (inventoryDestination) inventoryDestination.classList.toggle('hidden', inventorySource.innerText === '');

        const addButtonUpdated = html.getElementById(`ProductSubmitButton-${sectionId}`);
        this.toggleAddButton(
          addButtonUpdated ? addButtonUpdated.hasAttribute('disabled') : true,
          window.variantStrings.soldOut
        );
        const stickyAddButtonUpdated = html.getElementById(`StickyProductSubmitButton-${sectionId}`);
        this.toggleStickyAddButton(
            stickyAddButtonUpdated ? stickyAddButtonUpdated.hasAttribute('disabled') : true,
            window.variantStrings.soldOut
        );

        publish(PUB_SUB_EVENTS.variantChange, {
          data: {
            sectionId,
            html,
            variant: this.currentVariant,
          },
        });
      });
  }

  toggleAddButton(disable = true, text, modifyClass = true) {
    const productForm = document.getElementById(`product-form-${this.dataset.section}`);
    if (!productForm) return;
    const addButton = productForm.querySelector('[name="add"]');
    const addButtonText = productForm.querySelector('[name="add"] > span');
    if (!addButton) return;

    if (disable) {
      addButton.setAttribute('disabled', 'disabled');
      if (text) addButtonText.textContent = text;
    } else {
      addButton.removeAttribute('disabled');
      addButtonText.textContent = addButton.hasAttribute('data-preorder') ? 
          window.variantStrings.preOrder : 
          window.variantStrings.addToCart;
    }

    if (!modifyClass) return;
  }
  toggleStickyAddButton(disable = true, text, modifyClass = true) {
    const stickyProductForm = document.getElementById(`sticky-atc-${this.dataset.section}`);
    if (!stickyProductForm) return;
    const stickyAddButton = stickyProductForm.querySelector('[name="add"]');
    const stickyAddButtonText = stickyAddButton.querySelector('[name="add"] > span');
  
    if (!stickyAddButton) return;
  
    if (disable) {
      stickyAddButton.setAttribute('disabled', 'disabled');
      if (text) stickyAddButtonText.textContent = text;
    } else {
      stickyAddButton.removeAttribute('disabled');
      stickyAddButtonText.textContent = stickyAddButton.hasAttribute('data-preorder') ? 
          window.variantStrings.preOrder : 
          window.variantStrings.addToCart;
    }
    if (!modifyClass) return;
  }
  
  updateStickyPrice(sectionId, html) {
    const stickyPriceSourceId = `price-${sectionId}-sticky`;
    const stickyPriceDestinationId = `price-${sectionId}-sticky`;
    
    const source = html.getElementById(stickyPriceSourceId);
    const destination = document.getElementById(stickyPriceDestinationId);
  
    if (source && destination) {
      destination.innerHTML = source.innerHTML;
      destination.classList.toggle('hidden', source.classList.contains('hidden'));
    }
    const price = document.getElementById(`price-${sectionId}-sticky`);
    if (price) {
      price.classList.remove('hidden');
    }
  }
  updateStickyImage(sectionId, html) {
    const sourceImage = html.getElementById(`image-${sectionId}-sticky`);
    const destinationImage = document.getElementById(`image-${sectionId}-sticky`);

    if (sourceImage && destinationImage) {
      destinationImage.src = sourceImage.src;
      destinationImage.srcset = sourceImage.srcset;
      destinationImage.sizes = sourceImage.sizes;
    }
  }

  setUnavailable() {
    const button = document.getElementById(`product-form-${this.dataset.section}`);
    const addButton = button.querySelector('[name="add"]');
    const addButtonText = button.querySelector('[name="add"] > span');
    const buttonSticky = document.getElementById(`sticky-atc-${this.dataset.section}`);
    const addButtonSticky = buttonSticky?.querySelector('[name="add"]');
    const addButtonTextSticky = buttonSticky?.querySelector('[name="add"] > span');
    const price = document.getElementById(`price-${this.dataset.section}`);
    const priceSticky = document.getElementById(`price-${this.dataset.section}-sticky`);
    const inventory = document.getElementById(`Inventory-${this.dataset.section}`);
    const sku = document.getElementById(`Sku-${this.dataset.section}`);
    const pricePerItem = document.getElementById(`Price-Per-Item-${this.dataset.section}`);
    const volumeNote = document.getElementById(`Volume-Note-${this.dataset.section}`);
    const volumeTable = document.getElementById(`Volume-${this.dataset.section}`);
    const qtyRules = document.getElementById(`Quantity-Rules-${this.dataset.section}`);

    if (addButton && addButtonText) {
      addButtonText.textContent = window.variantStrings.unavailable;
    }
    if (addButtonSticky && addButtonTextSticky) {
      addButtonTextSticky.textContent = window.variantStrings.unavailable;
    }
    if (price) price.classList.add('hidden');
    if (priceSticky) priceSticky.classList.add('hidden');
    if (inventory) inventory.classList.add('hidden');
    if (sku) sku.classList.add('hidden');
    if (pricePerItem) pricePerItem.classList.add('hidden');
    if (volumeNote) volumeNote.classList.add('hidden');
    if (volumeTable) volumeTable.classList.add('hidden');
    if (qtyRules) qtyRules.classList.add('hidden');
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}
customElements.define('variant-selects', VariantSelects);



class AccountIcon extends HTMLElement {
  constructor() {
    super();

    this.icon = this.querySelector('.icon');
  }

  connectedCallback() {
    document.addEventListener('storefront:signincompleted', this.handleStorefrontSignInCompleted.bind(this));
  }

  handleStorefrontSignInCompleted(event) {
    if (event?.detail?.avatar) {
      this.icon?.replaceWith(event.detail.avatar.cloneNode());
    }
  }
}

customElements.define('account-icon', AccountIcon);

var dispatchCustomEvent = function dispatchCustomEvent(eventName) {
  var data = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var detail = {
    detail: data
  };
  var event = new CustomEvent(eventName, data ? detail : null);
  document.dispatchEvent(event);
};

const setScrollbarWidth = () => {
  const scrollbarWidth = window.innerWidth - document.body.clientWidth;
  if (scrollbarWidth > 0) {
    document.documentElement.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
  }
};
setScrollbarWidth();
window.addEventListener("resize", throttle(setScrollbarWidth));

class ResponsiveImage extends HTMLElement {
  constructor() {
    super();
    this.handleIntersection = this.handleIntersection.bind(this);
    this.onImageLoad = this.onImageLoad.bind(this);
    this.onResize = this.onResize.bind(this);

    this.intersectionObserver = new IntersectionObserver(this.handleIntersection, {
      rootMargin: '10px',
      threshold: 0
    });

    this.resizeObserver = new ResizeObserver(this.onResize);
  }

  connectedCallback() {
    this.img = this.querySelector('img');
    if (this.img) {
      this.img.addEventListener('load', this.onImageLoad);
      this.img.classList.add('img-loading');

      if (this.img.hasAttribute('srcset')) {
        this.originalSrcset = this.img.getAttribute('srcset');
        this.img.removeAttribute('srcset');
        this.intersectionObserver.observe(this.img);
      }
    }
  }

  disconnectedCallback() {
    if (this.img) {
      this.img.removeEventListener('load', this.onImageLoad);
      this.intersectionObserver.unobserve(this.img);
      this.resizeObserver.unobserve(this.img);
      this.intersectionObserver.disconnect();
      this.resizeObserver.disconnect();
    }
  }

  onImageLoad() {
    this.img.classList.remove('img-loading');
    this.img.classList.add('img-loaded');
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;

        if (this.hasAttribute('data-sizes') && this.getAttribute('data-sizes') === "true") {
          this.updateSizes(img);
          this.resizeObserver.observe(img);
        }

        img.setAttribute('srcset', this.originalSrcset);
        this.intersectionObserver.unobserve(img);
      }
    });
  }

  onResize(entries) {
    entries.forEach(entry => {
      if (this.hasAttribute('data-sizes') && this.getAttribute('data-sizes') === "true") {
        this.updateSizes(entry.target);
      }
    });
  }

  updateSizes(img) {
    const width = Math.floor(img.getBoundingClientRect().width);
    img.setAttribute('sizes', `${width}px`);
  }
}

customElements.define('responsive-image', ResponsiveImage);


/**
 *  @class
 *  @function ViewportMedia
 */

if (!customElements.get('viewport-media')) {
  class ViewportMedia extends HTMLElement {
    constructor() {
      super();
      this.initObserver();
    }
  
    initObserver() {
      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.loadContent();
              this.observer.unobserve(entry.target);
              this.observer.disconnect();
            }
          });
        }, {
          rootMargin: '200px 0px 200px 0px' 
        });
  
        this.observer.observe(this);
      } else {
        this.loadContent();
      }
    }
  
    loadContent() {
      if (!this.getAttribute('loaded')) {
        const template = this.querySelector('template');
        if (template && template.content && template.content.firstElementChild) {
          const content = document.createElement('div');
          content.appendChild(template.content.firstElementChild.cloneNode(true));
    
          this.setAttribute('loaded', true);
          const deferredElement = this.appendChild(content.querySelector('video, iframe'));
    
          if (deferredElement.nodeName === 'IFRAME') {
            const src = deferredElement.getAttribute('data-src');
            if (src) {
              deferredElement.setAttribute('src', src);
            }
            deferredElement.onload = () => this.removePlaceholder();
          }
          if (deferredElement.nodeName === 'VIDEO') {
            const isAutoplay = deferredElement.getAttribute('autoplay');
            const poster = deferredElement.getAttribute('poster');
            if (!isAutoplay && poster) {
              deferredElement.setAttribute('poster', poster);
            }
            deferredElement.onloadeddata = () => {
             
              this.removePlaceholder();
              if (isAutoplay) {
                deferredElement.muted = true; 
                deferredElement.play().catch(error => {
                  console.warn('Autoplay failed:', error);
                });
              }
              this.initVideoControls(deferredElement);
            };
            deferredElement.load();
          }
        }
      }
    }


    initVideoControls(video) {
      const playPauseButton = this.querySelector('.video-play-pause');
      const muteToggleButton = this.querySelector('.video-mute-toggle');
      const progressFilled = this.querySelector('.video-progress-filled');
      let updateProgress;
    
      // Handle Play/Pause Button
      if (playPauseButton) {
        playPauseButton.addEventListener('click', () => {
          if (video.paused) {
            video.play();
            playPauseButton.classList.remove('is-play');
            playPauseButton.classList.add('is-pause');
            updateProgress = requestAnimationFrame(updateProgressBar);
          } else {
            video.pause();
            playPauseButton.classList.remove('is-pause');
            playPauseButton.classList.add('is-play');
            cancelAnimationFrame(updateProgress);
          }
        });
    
        // Reset button state on video end
        video.addEventListener('ended', () => {
          if (playPauseButton) {
            playPauseButton.classList.remove('is-pause');
            playPauseButton.classList.add('is-play');
          }
        });
      }
    
      // Handle Mute/Unmute Button
      if (muteToggleButton) {
        muteToggleButton.addEventListener('click', () => {
          video.muted = !video.muted;
          if (video.muted) {
            muteToggleButton.classList.add('is-muted');
            muteToggleButton.classList.remove('is-unmuted');
          } else {
            muteToggleButton.classList.remove('is-muted');
            muteToggleButton.classList.add('is-unmuted');
          }
        });
      }
    
      // Handle Progress Bar
      if (progressFilled) {
        const updateProgressBar = () => {
          const percentage = (video.currentTime / video.duration) * 100 || 0;
          progressFilled.style.width = `${percentage}%`;
    
          // Continue updating while playing
          updateProgress = requestAnimationFrame(updateProgressBar);
        };
    
        video.addEventListener('timeupdate', updateProgressBar);
    
        // Reset progress on end
        video.addEventListener('ended', () => {
          cancelAnimationFrame(updateProgress);
          if (progressFilled) {
            progressFilled.style.width = '0%';
          }
        });
    
        // Start progress tracking when the video can play
        video.addEventListener('canplay', () => {
          if (progressFilled) {
            progressFilled.style.width = '0%';
          }
          if (!video.paused) updateProgress = requestAnimationFrame(updateProgressBar);
        });
      }
    }
    
    
    removePlaceholder() {
      const placeholder = this.querySelector('.video-placeholder');
      if (placeholder) {
        placeholder.style.display = 'none';
      }
    }
  }
  
  customElements.define('viewport-media', ViewportMedia);
}


/**
 *  @class
 *  @function SplideCarousel
 */


  class SplideCarousel extends HTMLElement {
    constructor() {
      super();
      this.slideInstance = null;
      this.isUserInteracting = false; // Track if user is interacting
    }

    connectedCallback() {
      if (!this.slideInstance) { 
        const splideElement = this.querySelector('.splide');
        const options = splideElement.getAttribute('data-splide');
        
        if (options) {
          try {
            const parsedOptions = JSON.parse(options);
            this.slideInstance = new Splide(splideElement, parsedOptions);

            this.slideInstance.on('mounted', () => {
              this.handleVideoPlayback(); 
            });
            this.slideInstance.on('move', () => {
              this.handleVideoPlayback();
            });
            setTimeout(() => this.handleVideoPlayback(), 100);
            
            setTimeout(() => this.initializeProgressBar(), 300);
            this.slideInstance.mount();
          } catch (e) {
            console.error('Failed to initialize Splide carousel:', e);
          }
        }
        this.initObserver(); 
        if (Shopify.designMode) {
          this.addShopifyEventListeners();
        }
      }
    }

    disconnectedCallback() {
      if (Shopify.designMode) {
        this.removeShopifyEventListeners();
      }
    }

    initObserver() {
      if ('IntersectionObserver' in window) {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              this.handleVideoPlayback();
            }
          });
        }, {
          rootMargin: '0px 0px -50% 0px' 
        });
        
        this.observer.observe(this);
      } else {
        this.handleVideoPlayback();
      }
    }

    handleVideoPlayback() {
      if (!this.slideInstance) return;
    
      if (this.hasAttribute('data-play-videos') && this.getAttribute('data-play-videos') === 'true') {
        return;
      }
      const slides = this.slideInstance.Components.Elements.slides;
    
      slides.forEach((slide, index) => {
        const video = slide.querySelector('.shopable-video__video');
    
        if (video && !slide.classList.contains('is-clone')) {
          const isActiveSlide = this.slideInstance.index === index;
    
          if (isActiveSlide) {
            if (video.paused) {
              video.play().catch((e) => {
                console.error('Error playing video:', e);
              });
            }
          } else {
            if (!video.paused) {
              video.pause();
            }
          }
        } else if (video) {
          video.pause();
        }
      });
    }

    addShopifyEventListeners() {
      this.handleBlockSelect = this.handleBlockSelect.bind(this);
      this.handleBlockDeselect = this.handleBlockDeselect.bind(this);
      document.addEventListener('shopify:block:select', this.handleBlockSelect);
      document.addEventListener('shopify:block:deselect', this.handleBlockDeselect);
    }

    removeShopifyEventListeners() {
      document.removeEventListener('shopify:block:select', this.handleBlockSelect);
      document.removeEventListener('shopify:block:deselect', this.handleBlockDeselect);
    }

    handleBlockSelect(event) {
      const blockElement = event.target;
      const carouselElement = blockElement.closest('splide-carousel');
      if (carouselElement === this && this.slideInstance) {
        const index = parseInt(blockElement.getAttribute('data-splide-index'));
        if (!isNaN(index)) {
          this.slideInstance.go(index);
          this.isUserInteracting = true;
          this.slideInstance.Components.Autoplay.pause();
        }
      }
    }

    handleBlockDeselect(event) {
      const blockElement = event.target;
      const carouselElement = blockElement.closest('splide-carousel');
      if (carouselElement === this && this.slideInstance) {
        this.isUserInteracting = false;
      }
    }

    initializeProgressBar() {
      const bar = this.querySelector('.splide-carousel-progress-bar');
      if (bar && this.slideInstance) {
        const updateProgressBar = () => {
          requestAnimationFrame(() => {
            const end = this.slideInstance.Components.Controller.getEnd() + 1;
            const rate = Math.min((this.slideInstance.index + 1) / end, 1);
            bar.style.width = `${100 * rate}%`;
          });
        };

        updateProgressBar();
        this.slideInstance.on('mounted move', updateProgressBar);

        this.slideInstance.on('destroy', () => {
          this.slideInstance.off('mounted move', updateProgressBar);
        });
      }
    }
  }
  customElements.define('splide-carousel', SplideCarousel);


/**
 *  @class
 *  @function Slideshow
 */
if (!customElements.get('slide-show')) {
  class Slideshow extends HTMLElement {
    constructor() {
      super();
      this.slideInstance = null;
      this.videoStates = new Map();
    }

    connectedCallback() {
      this.init();
      if (Shopify && Shopify.designMode) {
        document.addEventListener('shopify:block:select', this.handleBlockSelect.bind(this));
        document.addEventListener('shopify:block:deselect', this.handleBlockDeselect.bind(this));
      }
    }

    init() {
      const options = this.getAttribute('data-splide');
      if (options) {
        const parsedOptions = JSON.parse(options);
        this.slideInstance = new Splide(this, parsedOptions);

        if (this.getAttribute('data-pagination') === 'numbers') {
          this.slideInstance.on('pagination:mounted', this.customizePagination);
        }

        this.slideInstance.mount();
        this.slideInstance.on('moved', this.handleVideoPlayback.bind(this));
        this.slideInstance.on('moved', this.updateSlideCounter.bind(this));
        this.slideInstance.on('moved', this.handleFirstSlide.bind(this)); 
        this.updateSlideCounter(this.slideInstance.index);

        
      }
    }

    handleFirstSlide() {
      const slides = this.slideInstance.Components.Elements.slides;
      slides.forEach((slide) => {
        slide.classList.remove('first-slide');
      });
    }

    handleVideoPlayback() {
      const slides = this.slideInstance.Components.Elements.slides;
      slides.forEach((slide) => {
        const video = slide.querySelector('video');
        if (video) {
          video.muted = true;
          if (slide.classList.contains('is-active')) {
            video.play();
          } else {
            video.pause();
          }
        }
      });
    }

    updateSlideCounter(newIndex) {
      const totalSlides = this.slideInstance.length;
      const currentSlideElement = this.querySelector('.current-slide');
      const totalSlidesElement = this.querySelector('.total-slides');

      if (currentSlideElement && totalSlidesElement) {
        totalSlidesElement.textContent = totalSlides;
        currentSlideElement.textContent = newIndex + 1;
      }
    }

    customizePagination(data) {
      data.list.classList.add('splide__pagination--custom');
      data.items.forEach((item) => {
        item.button.textContent = String(item.page + 1).padStart(2, '0');
      });
    }

    handleBlockSelect(event) {
      const blockElement = event.target;
      const carouselElement = blockElement.closest('slide-show');
      if (carouselElement && carouselElement.slideInstance) {
        const index = parseInt(blockElement.getAttribute('data-splide-index'));
        if (!isNaN(index)) {
          carouselElement.slideInstance.go(index);
          carouselElement.isUserInteracting = true;
          carouselElement.slideInstance.Components.Autoplay.pause();
        }
      }
    }

    handleBlockDeselect(event) {
      const blockElement = event.target;
      const carouselElement = blockElement.closest('slide-show');
      if (carouselElement && carouselElement.slideInstance) {
        carouselElement.isUserInteracting = false;
      }
    }
  }

  customElements.define('slide-show', Slideshow);
}

/**
 *  @class
 *  @function AsyncCarousel
 */

if (!customElements.get('async-carousel')) {
  class AsyncCarousel extends HTMLElement {
    constructor() {
      super();
      this.slideInstance = null;
      this.thumbnailInstance = null;
      this.isUserInteracting = false;
      this.thumbnails = null;
      this.currentThumbnail = null;
    }

    connectedCallback() {
      this.initCarousel();
    }

    initCarousel() {
      const mainSlider = this.querySelector('[data-slider="main"]');
      const thumbnailSlider = this.querySelector('[data-slider="thumbnail"]');

      if (mainSlider) {
        const mainOptions = JSON.parse(mainSlider.getAttribute('data-splide') || '{}');
        this.slideInstance = new Splide(mainSlider, mainOptions);
        
        if (thumbnailSlider) {
          const thumbnailOptions = JSON.parse(thumbnailSlider.getAttribute('data-splide') || '{}');
          this.thumbnailInstance = new Splide(thumbnailSlider, thumbnailOptions);
          this.slideInstance.sync(this.thumbnailInstance);
          this.updateThumbnailARIA(thumbnailSlider);
        }

        this.slideInstance.mount();
        if (this.thumbnailInstance) {
          this.thumbnailInstance.mount();
        }
        
        setTimeout(() => this.initializeProgressBar(), 300);
        this.initThumbnails();
        this.addShopifyEventListeners();
      }
    }

    disconnectedCallback() {
      if (Shopify.designMode) {
        this.removeShopifyEventListeners();
      }
    }

    addShopifyEventListeners() {
      if (Shopify.designMode) {
        document.addEventListener('shopify:block:select', this.handleBlockSelect.bind(this));
        document.addEventListener('shopify:block:deselect', this.handleBlockDeselect.bind(this));
      }
    }

    removeShopifyEventListeners() {
      document.removeEventListener('shopify:block:select', this.handleBlockSelect.bind(this));
      document.removeEventListener('shopify:block:deselect', this.handleBlockDeselect.bind(this));
    }

    handleBlockSelect(event) {
      const blockElement = event.target;
      const index = parseInt(blockElement.getAttribute('data-splide-index'));

      if (!isNaN(index) && this.slideInstance) {
        this.slideInstance.go(index);
        this.isUserInteracting = true;
        this.slideInstance.Components.Autoplay.pause();
      }
    }

    handleBlockDeselect() {
      this.isUserInteracting = false;
    }

    initThumbnails() {
      this.thumbnails = this.querySelectorAll('.thumbnail-item');
      this.thumbnails.forEach((thumbnail, index) => {
        thumbnail.addEventListener('click', () => {
          this.slideInstance.go(index);
        });
      });

      this.slideInstance.on('mounted move', () => {
        const thumbnail = this.thumbnails[this.slideInstance.index];
        if (thumbnail) {
          if (this.currentThumbnail) {
            this.currentThumbnail.classList.remove('is-active');
          }
          thumbnail.classList.add('is-active');
          this.currentThumbnail = thumbnail;
        }
      });
    }

    initializeProgressBar() {
      const bar = this.querySelector('.splide-carousel-progress-bar');
      if (bar && this.slideInstance) {
        const updateProgressBar = () => {
          const end = this.slideInstance.Components.Controller.getEnd() + 1;
          const rate = Math.min((this.slideInstance.index + 1) / end, 1);
          bar.style.width = `${100 * rate}%`;
        };

        updateProgressBar();
        this.slideInstance.on('mounted move', updateProgressBar);
      }
    }

    updateThumbnailARIA(thumbnailSlider) {
      const thumbnailItems = thumbnailSlider.querySelectorAll('.splide__slide');
      thumbnailItems.forEach(thumbnailItem => {
        thumbnailItem.setAttribute('role', 'group');
      });
    }
  }

  customElements.define('async-carousel', AsyncCarousel);
}


/**
 *  @class
 *  @function GalleryCarousel
 */

if (!customElements.get('gallery-carousel')) {
  class GalleryCarousel extends HTMLElement {
    constructor() {
      super();
      this.main = null;
      this.thumbnails = null;
      this.originalSlides = [];
      this.originalThumbnails = [];
    }

    connectedCallback() {
      const mainCarousel = this.querySelector('[id^="Main-Carousel"]');
      const thumbnailCarousel = this.querySelector('[id^="Thumbnail-Carousel"]');

      if (!mainCarousel || !thumbnailCarousel) {
        console.error('Main or thumbnail carousel element not found.');
        return;
      }

      this.originalSlides = [...mainCarousel.querySelectorAll('.splide__slide')];
      this.originalThumbnails = [...thumbnailCarousel.querySelectorAll('.splide__slide')];

      const mainOptions = this.getCarouselOptions(mainCarousel);
      const thumbnailOptions = this.getCarouselOptions(thumbnailCarousel);

      const initialSlideIndex = this.getInitialSlideIndex();

      mainOptions.start = initialSlideIndex;
      thumbnailOptions.start = initialSlideIndex;

      this.initializeCarousels(mainCarousel, mainOptions, thumbnailCarousel, thumbnailOptions);
      this.addEventListeners();

      //this.updateSplide();
      const enableFiltering = this.dataset.mediaGrouping === "true";
      if (enableFiltering) {
        const defaultFilter = this.dataset.filterSelected;
        this.filterSlides(defaultFilter);

        document.querySelectorAll(".variant-picker__color input[type='radio']").forEach((radio) => {
          radio.addEventListener("change", () => this.filterSlides(radio.value));
        });
      }
    }

    getCarouselOptions(carouselElement) {
      return JSON.parse(carouselElement.getAttribute('data-splide') || '{}');
    }

    getInitialSlideIndex() {
      const selectedThumbnailSlide = this.querySelector('.thumbnail-carousel .splide__slide[data-selected="true"]');
      
      if (selectedThumbnailSlide) {
        const thumbnailSlides = Array.from(this.querySelectorAll('.thumbnail-carousel .splide__slide'));
        return thumbnailSlides.indexOf(selectedThumbnailSlide);
      }
      return 0;
    }

    initializeCarousels(mainCarousel, mainOptions, thumbnailCarousel, thumbnailOptions) {
      this.main = new Splide(mainCarousel, mainOptions);
      this.thumbnails = new Splide(thumbnailCarousel, thumbnailOptions);
      const isVerticalThumbnail = thumbnailCarousel.getAttribute('data-thumbnail') === 'vertical';
      if (isVerticalThumbnail) {
        this.thumbnails.on('mounted', () => {
          const thumbnailList = thumbnailCarousel.querySelector('.splide__list');
          if (thumbnailList) {
            thumbnailList.setAttribute('role', 'tablist');
          }
        });
        this.thumbnails.on('mounted', this.updateThumbnailARIA.bind(this));
      }

      this.main.on('mounted', () => {
        mainCarousel.classList.remove('is-initializing');
        if (this.main.index !== undefined) {
            this.updateSlideCounter(this.main.index);
        }
      });

      this.thumbnails.mount();
      this.main.sync(this.thumbnails);
      this.main.mount();
      this.main.on('moved', this.updateSlideCounter.bind(this));
      this.updateSlideCounter(this.main.index);
      
    }

    addEventListeners() {
      this.main.on('inactive', this.handleInactiveSlide.bind(this));
      this.main.on('active', this.handleMainActiveSlide.bind(this));
      this.thumbnails.on('active', this.handleThumbnailActiveSlide.bind(this));
    }

    updateSlideCounter(newIndex) {
      const totalSlides = this.main.length;
      const currentSlideElement = this.querySelector('.current-slide');
      const totalSlidesElement = this.querySelector('.total-slides');

      if (currentSlideElement && totalSlidesElement) {
        totalSlidesElement.textContent = totalSlides;
        currentSlideElement.textContent = newIndex + 1;
      }
    }

    handleInactiveSlide(oldSlide) {
      const inactiveSlide = this.main.Components.Elements.slides[oldSlide.index];
      this.pauseYouTubeVideo(inactiveSlide);
    }

    handleMainActiveSlide(newSlide) {
      window.pauseAllMedia();
      const activeSlide = this.main.Components.Elements.slides[newSlide.index];
      this.handleActiveSlide(activeSlide);

      const hasProductModel = activeSlide.querySelector('product-model') !== null;
      this.main.Components.Drag.disable(hasProductModel);
    }

    handleThumbnailActiveSlide(newSlide) {
      window.pauseAllMedia();
      const target = this.thumbnails.Components.Elements.slides[newSlide.index].getAttribute('data-target');
      const activeSlide = Array.from(this.main.Components.Elements.slides).find(slide => slide.getAttribute('data-media-id') === target);
      this.handleActiveSlide(activeSlide);
    }

    handleActiveSlide(slide) {
      if (slide && !slide.dataset.played) {
        const autoplay = this.getAttribute('data-autoplay');
        if (autoplay === 'true') {
          this.playActiveMedia(slide);
          slide.dataset.played = true;
        }
      }
    }

    playActiveMedia(activeSlide) {
      const deferredMedia = activeSlide.querySelector('.deferred-media');
      if (deferredMedia) {
        
        deferredMedia.loadContent(false);
      }
    }

    pauseYouTubeVideo(slide) {
      const iframe = slide.querySelector('iframe');
      if (iframe && iframe.src.includes('youtube.com')) {
        iframe.src = iframe.src.replace('autoplay=1', 'autoplay=0');
      }
    }

    updateCarouselImages(mediaId) {
      if (!this.main) {
        return;
      }
      const mainSlides = this.main.Components.Elements.slides;
      const mainSlide = mainSlides.find(slide => slide.getAttribute('data-media-id') === mediaId.toString());

      if (mainSlide) {
        const mainIndex = mainSlides.indexOf(mainSlide);
        if (mainIndex !== -1) {
          this.main.go(mainIndex);
        }
      }
      
      if( this.hasAttribute('desktop-grid') && window.innerWidth >= 768){
        const galleryListsContainer = this.querySelector('.splide__gallery'); 
        if (galleryListsContainer) {
          const galleryLists = galleryListsContainer.querySelectorAll('.splide__slide');
          galleryLists.forEach(item => {
            if (item.getAttribute('data-media-id') === mediaId.toString()) {
              
              const headerOffset = document.querySelector('.header').offsetHeight + 16;
              const elementPosition = item.getBoundingClientRect().top + window.pageYOffset;
              const offsetPosition = elementPosition - headerOffset;

              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });
            }
          });
        }
      } 
    }

    updateThumbnailARIA() {
      if (!this.thumbnails || !this.thumbnails.Components || !this.thumbnails.Components.Elements.list) return;
      const thumbnailItems = this.thumbnails.Components.Elements.list.querySelectorAll('.splide__slide');
      thumbnailItems.forEach((thumbnailItem) => {
        thumbnailItem.setAttribute('role', 'tab');
      });
    }

    filterSlides(group) {
      let mainList = this.main.Components.Elements.list;
      let thumbList = this.thumbnails.Components.Elements.list;
    
      if (!mainList || !thumbList) {
        console.error('Splide list element not found for main or thumbnails.');
        return;
      }
    
      mainList.innerHTML = "";
      thumbList.innerHTML = "";
    
      let slidesToShow = this.originalSlides;
      let thumbsToShow = this.originalThumbnails;
    
      if (group && group.trim() !== "") {
        let filteredSlides = this.originalSlides.filter(slide => slide.dataset.mediaGroup === group);
        let filteredThumbs = this.originalThumbnails.filter(slide => slide.dataset.mediaGroup === group);
    
        if (filteredSlides.length > 0 && filteredThumbs.length > 0) {
            slidesToShow = filteredSlides;
            thumbsToShow = filteredThumbs;
        }
        
      }

      slidesToShow.forEach(slide => mainList.appendChild(slide));
      thumbsToShow.forEach(slide => thumbList.appendChild(slide));
    
      try {
          this.main.refresh();
          this.thumbnails.refresh();
    
          if (slidesToShow.length > 0) {
              this.main.go(0);
              this.thumbnails.go(0);
              this.updateSlideCounter(0); 
          } else {
              this.updateSlideCounter(-1); 
              console.warn("No slides to display in the carousel after filtering.");
          }
      } catch (error) {
          console.error("Error refreshing Splide instances:", error);
      }
    
      this.querySelectorAll('responsive-image').forEach(img => {
        if (img.img && img.intersectionObserver && img.img instanceof Element) {
          img.intersectionObserver.observe(img.img);
        }
      });
    
      // Update ARIA attributes for accessibility on the thumbnails
      this.updateThumbnailARIA();
    }
    
  }
  
  customElements.define('gallery-carousel', GalleryCarousel);
}


/**
 *  @class
 *  @function ProductRecommendations
 */
if (!customElements.get('product-recommendations')) {
  class ProductRecommendations extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.dataset.url ? this.fetchProducts() : console.error('No data-url attribute found.');
    }

    async fetchProducts() {
      try {
        const response = await fetch(this.dataset.url);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, 'text/html');
        const recommendations = doc.querySelector('product-recommendations');
        
        if (recommendations && recommendations.innerHTML.trim()) {
          this.renderRecommendations(recommendations.innerHTML);
        } else {
          //console.warn('No product recommendations found.');
        }

      } catch (error) {
        console.error('Error fetching product recommendations:', error);
      }
    }

    renderRecommendations(html) {
      this.innerHTML = html;
      this.initCarousels();
      this.classList.add('product-recommendations--loaded');
    }

    initCarousels() {
      const carousels = this.querySelectorAll('splide-carousel');
      carousels.forEach(carousel => carousel.connectedCallback?.());
    }
  }

  customElements.define('product-recommendations', ProductRecommendations);
}



class ComponentDrawer extends HTMLElement {
  constructor() {
    super();

    this.overlay = this.querySelector('.drawer-overlay');
    this.drawer = this.querySelector('.drawer-content');
    this.closeButton = this.querySelector('.close-drawer-btn');
    this.triggerButton = null;

    this.overlay.addEventListener('click', () => this.close());
    this.closeButton.addEventListener('click', () => this.close());
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.trapFocus = this.trapFocus.bind(this);
  }

  connectedCallback() {
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'dialog');
    }
    document.addEventListener('keydown', this.handleKeyPress);
  }
  
  disconnectedCallback() {
    document.removeEventListener('keydown', this.handleKeyPress);
    document.removeEventListener('focus', this.trapFocus, true);
  }

  open(triggerButton) {
    this.triggerButton = triggerButton; 
    this.setAttribute('open', '');
    document.body.classList.add('overflow-hidden');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.closeButton.focus();
    document.addEventListener('focus', this.trapFocus, true);
  }

  close() {
    this.removeAttribute('open');
    document.body.classList.remove('overflow-hidden');
    this.drawer.setAttribute('aria-hidden', 'true');
    document.removeEventListener('focus', this.trapFocus, true);
  
    if (this.triggerButton) {
      this.triggerButton.focus();
      this.triggerButton = null;
    }
  }

  handleKeyPress(event) {
    if (event.key === 'Escape') {
      this.close();
    }
  }
  
  trapFocus(event) {
    if (!this.contains(event.target)) {
      event.stopPropagation();
      this.closeButton.focus();
    }
  }

  static get observedAttributes() {
    return ['open'];
  }
}

customElements.define('component-drawer', ComponentDrawer);

class SearchDrawer extends ComponentDrawer {
  constructor() {
    super();
    this.predictiveSearch = this.querySelector('predictive-search');
    this.openTransitionEndHandler = this.openTransitionEndHandler.bind(this);
  }

  open(triggerButton) {
    this.triggerButton = triggerButton; 
    this.setAttribute('open', '');
    document.body.classList.add('overflow-hidden');
    this.drawer.setAttribute('aria-hidden', 'false');
    this.addEventListener('transitionend', this.openTransitionEndHandler);
    document.addEventListener('focus', this.trapFocus, true);
  }

  openTransitionEndHandler(event) {
    if (event.target === this.overlay) {
      this.removeEventListener('transitionend', this.openTransitionEndHandler);

      if (this.predictiveSearch) {
        setTimeout(() => {
          const focusElement = this.predictiveSearch.querySelector('input:not([type="hidden"])');
          if (focusElement && typeof focusElement.focus === 'function') {
            focusElement.focus();
          }
        }, 150);
      }
    }
  }

  close() {
    if (this.predictiveSearch) {
      const inputElement = this.predictiveSearch.querySelector('input:not([type="hidden"])');
      if (inputElement) {
        inputElement.value = '';
      }
      if (this.predictiveSearch.hasAttribute('open')) {
        this.predictiveSearch.removeAttribute('open');
      }
      this.predictiveSearch.setAttribute('results', 'false');
    }

    super.close();
  }
}


customElements.define('search-drawer', SearchDrawer);

class DrawerButton extends HTMLElement {
  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
  }

  connectedCallback() {
    this.targetId = this.getAttribute('data-target');
    this.targetDrawer = document.getElementById(this.targetId);
    
    this.setAttribute('tabindex', '0');
    this.setAttribute('role', 'button');
    
    if (this.targetDrawer) {
      this.addEventListener('click', this.handleClick);
      this.addEventListener('keydown', this.handleKeyPress);
    } else {
      console.warn(`Drawer element with ID '${this.targetId}' does not exist.`);
    }
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyPress);
  }

  handleKeyPress(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  }

  handleClick() {
    if (this.targetDrawer && typeof this.targetDrawer.open === 'function') {
      this.targetDrawer.open(this); 
    }
  }
}

customElements.define('drawer-button', DrawerButton);

/**
 *  @class
 *  @function QuickView
 */
if (!customElements.get('quick-view')) {
  class QuickView extends HTMLElement {
    constructor() {
      super();
      this.isFetching = false;
      this.abortController = null;
      this.cache = {};
      this.cacheDuration = 60000; // 60 seconds
      this.boundTrapFocus = this.trapFocus.bind(this);
      this.isFocusTrapped = false;
      this.loadedScripts = new Set();
      this.initElements();
      this.bindEvents();
    }

    initElements() {
      const modal = document.getElementById('product-modal');
      this.elements = {
        overlay: document.querySelector('.product-quick-view-overlay'),
        modal,
        body: document.body,
        closeButton: modal?.querySelector('.product-modal-close'),
        modalContent: modal?.querySelector('#product-modal-content')
      };
    }

    bindEvents() {
      const { overlay, closeButton, modal } = this.elements;
      this.addEventListener('click', this.onQuickViewClick.bind(this));
      this.addEventListener('keydown', this.onQuickViewKeydown.bind(this));

      if (closeButton && overlay && modal) {
        overlay.addEventListener('click', this.closeQuickView.bind(this));
        closeButton.addEventListener('click', this.closeQuickView.bind(this));
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        modal.addEventListener('transitionend', this.onTransitionEnd.bind(this));
      } else {
        // Keep this error for debugging missing elements
        console.error('QuickView: Critical elements (Modal, Overlay, or Close Button) not found.');
      }
    }

    onKeyDown(event) {
      if (event.key === 'Escape' && this.elements.modal?.classList.contains('active')) {
        this.closeQuickView();
      }
    }

    onQuickViewKeydown(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        this.onQuickViewClick(event);
      }
    }

    trapFocus(event) {
      if (!this.isFocusTrapped || !this.elements.modal?.classList.contains('active')) return;

      if (event.key === "Tab") {
        const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusableContent = this.elements.modal.querySelectorAll(focusableElements);
        if (focusableContent.length === 0) return;
        const firstFocusableElement = focusableContent[0];
        const lastFocusableElement = focusableContent[focusableContent.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstFocusableElement) {
            event.preventDefault();
            lastFocusableElement.focus();
          }
        } else {
          if (document.activeElement === lastFocusableElement) {
            event.preventDefault();
            firstFocusableElement.focus();
          }
        }
      }
    }

    onTransitionEnd(event) {
      if (event.target === this.elements.modal && !this.elements.modal?.classList.contains('active')) {
        if (this.elements.modalContent) {
           this.elements.modalContent.innerHTML = '';
        }
      }
    }

    async onQuickViewClick(event) {
      event.preventDefault();

      if (this.isFetching || !this.elements.modalContent) return;

      const productHandle = this.dataset.productHandle;
      const href = this.buildProductUrl(productHandle);

      if (!href || !productHandle) return;

      this.classList.add('loading');
      this.elements.modalContent.innerHTML = '';
      this.elements.modalContent.classList.add('is-loading');

      const cachedData = this.cache[href];
      if (cachedData && (Date.now() - cachedData.timestamp < this.cacheDuration)) {
        this.renderQuickView(cachedData.content, href, productHandle);
        this.classList.remove('loading');
        setTimeout(() => {
            if (this.elements.modalContent) {
                this.elements.modalContent.classList.remove('is-loading');
            }
        }, 150);
        return;
      }

      if (this.abortController) {
        this.abortController.abort();
      }
      this.abortController = new AbortController();
      const signal = this.abortController.signal;

      this.isFetching = true;

      try {
        const content = await this.fetchProductContent(href, signal);
        if (!signal.aborted) {
          this.cache[href] = { content: content, timestamp: Date.now() };
          this.renderQuickView(content, href, productHandle);
        }
      } catch (error) {
         if (error.name !== 'AbortError') {
            console.error('Error fetching quick view content:', error);
            if (this.elements.modalContent) {
                this.elements.modalContent.innerHTML = '<p>Error loading product details.</p>';
            }
         }
      } finally {
        if (this.isFetching || signal?.aborted) {
            this.isFetching = false;
            this.classList.remove('loading');
            this.abortController = null;

            setTimeout(() => {
                if (this.elements.modalContent) {
                    this.elements.modalContent.classList.remove('is-loading');
                }
            }, 150);
        }
      }
    }

    buildProductUrl(productHandle) {
      const rootUrl = typeof theme?.routes?.root_url === 'string' ? theme.routes.root_url : '';
      const baseUrl = rootUrl === '/' ? '' : rootUrl;
      return `${baseUrl}/products/${productHandle}?view=quick-view`.replace('//', '/');
    }

    async fetchProductContent(url, signal) {
      const response = await fetch(url, { signal });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const contentElement = doc.querySelector('#product-modal-content');
      if (!contentElement) {
           throw new Error('Content element (#product-modal-content) not found in fetched HTML.');
      }
      return contentElement.innerHTML;
    }

    renderQuickView(content, url, productHandle) {
      if (!this.elements.modalContent) return;
      this.elements.modalContent.innerHTML = content;

      this.loadJavaScriptFiles();
      this.initializeShopifyComponents();
      this.openQuickView();
      this.dispatchQuickViewOpenEvent(url, productHandle);
    }

    loadJavaScriptFiles() {
       if (!this.elements.modalContent) return;
       this.elements.modalContent.querySelectorAll('script[src]').forEach(script => {
         const src = script.getAttribute('src');
         if (src && !this.loadedScripts.has(src) && !document.querySelector(`script[src="${src}"]`)) {
           const newScript = document.createElement('script');
           newScript.src = src;
           newScript.defer = true;
           document.head.appendChild(newScript);
           this.loadedScripts.add(src);
         }
       });
     }

    initializeShopifyComponents() {
      setTimeout(() => {
        try {
            if (typeof Shopify?.PaymentButton?.init === 'function') {
                Shopify.PaymentButton.init();
            }
            if (typeof window.ProductModel?.loadShopifyXR === 'function') {
                window.ProductModel.loadShopifyXR();
            }
        } catch (error) {
            console.error("Error initializing Shopify components:", error);
        }
      }, 200);
    }

    openQuickView() {
      const { body, modal, closeButton } = this.elements;
      if (!body || !modal) return;

      body.classList.add('quickview-open');
      modal.classList.add('active');

      setTimeout(() => {
          closeButton?.focus();
      }, 50);

      if (!this.isFocusTrapped) {
          document.addEventListener('keydown', this.boundTrapFocus);
          this.isFocusTrapped = true;
      }
    }

    closeQuickView() {
      const { body, modal } = this.elements;
       if (!body || !modal) return;

      body.classList.remove('quickview-open');
      modal.classList.remove('active');

      if (this.isFocusTrapped) {
          document.removeEventListener('keydown', this.boundTrapFocus);
          this.isFocusTrapped = false;
      }

       if (this.abortController) {
           this.abortController.abort();
       }
    }

    dispatchQuickViewOpenEvent(url, productHandle) {
      document.dispatchEvent(new CustomEvent('quick-view:open', {
        bubbles: true,
        detail: { productUrl: url, productHandle }
      }));
    }
  }

  customElements.define('quick-view', QuickView);
}

/**
 *  @class
 *  @function CollapsibleDetails
 */

if (!customElements.get('collapsible-details')) {
  class CollapsibleDetails extends HTMLElement {
    constructor() {
      super();
      this.toggleContent = this.toggleContent.bind(this);
      this.onTransitionEnd = this.onTransitionEnd.bind(this);
      this.updateHeight = this.updateHeight.bind(this);
      this.setResponsiveState = this.setResponsiveState.bind(this);
      this.isAnimating = false;
    }

    connectedCallback() {
      this.detailsEl = this.querySelector('details');
      this.summaryEl = this.querySelector('summary');
      this.contentEl = this.querySelector('.collapsible__content');
      this.contentInnerEl = this.querySelector('.collapsible__content-inner');
    
      if (!this.detailsEl || !this.summaryEl || !this.contentEl) {
        return;
      }
    
      this.wrapContent();
      this.setupInitialState();
      this.addEventListeners();
    
      // Setup ResizeObserver to handle content size changes
      if (this.contentInnerEl) {
        this.resizeObserver = new ResizeObserver(this.updateHeight);
        this.resizeObserver.observe(this.contentInnerEl);
      }
    
      if (this.detailsEl.dataset.responsive === 'true') {
        this.setResponsiveState();
      }
    
      this.mutationObserver = new MutationObserver(this.updateContentHeight.bind(this));
      if (this.contentInnerEl) {
        this.mutationObserver.observe(this.contentInnerEl, { 
          childList: true, 
          subtree: true, 
          characterData: true 
        });
      }
    }


    wrapContent() {
      if (!this.contentEl || !this.contentEl.parentElement) {
        return;
      }
    
      if (this.contentEl.parentElement.classList.contains('collapsible__content-wrapper')) {
        this.contentWrapper = this.contentEl.parentElement;
        return;
      }
    
      this.contentWrapper = document.createElement('div');
      this.contentWrapper.className = 'collapsible__content-wrapper';
    
      this.contentEl.parentNode.insertBefore(this.contentWrapper, this.contentEl);
      this.contentWrapper.appendChild(this.contentEl);
    }
    

    setupInitialState() {
      if (!this.detailsEl) {
        return;
      }
    
      if (this.detailsEl.hasAttribute('open')) {
        this.contentWrapper.style.height = 'auto';
        this.contentEl.style.transform = 'translateY(0)';
        this.detailsEl.classList.add('is-open');
      } else {
        this.contentWrapper.style.height = '0';
        this.contentEl.style.transform = 'translateY(16px)';
      }
    }


    addEventListeners() {
      if (!this.summaryEl || !this.contentWrapper) {
        return;
      }
    
      this.summaryEl.addEventListener('click', this.toggleContent);
      this.contentWrapper.addEventListener('transitionend', this.onTransitionEnd);
    }

    toggleContent(event) {
      event.preventDefault();
      if (this.isAnimating) {
        this.pendingState = !this.detailsEl.open;
        return;
      }
      
      this[this.detailsEl.open ? 'closeContent' : 'openContent']();
    }

    openContent() {
      this.isAnimating = true;
      this.detailsEl.open = true;
      
      requestAnimationFrame(() => {
        const height = this.contentEl.scrollHeight;
        this.contentWrapper.style.height = '0';
        this.contentEl.style.transform = 'translateY(16px)';
        
        requestAnimationFrame(() => {
          this.detailsEl.classList.add('is-open');
          this.contentWrapper.style.height = `${height}px`;
          this.contentEl.style.transform = 'translateY(0)';
        });
      });
    }

    closeContent() {
      this.isAnimating = true;
      
      requestAnimationFrame(() => {
        const height = this.contentWrapper.scrollHeight;
        this.contentWrapper.style.height = `${height}px`;
        
        requestAnimationFrame(() => {
          this.detailsEl.classList.remove('is-open');
          this.contentWrapper.style.height = '0';
          this.contentEl.style.transform = 'translateY(16px)';
        });
      });
    }

    onTransitionEnd(event) {
      if (event.propertyName !== 'height' || event.target !== this.contentWrapper) return;
      
      this.isAnimating = false;
      
      if (!this.detailsEl.classList.contains('is-open')) {
        this.detailsEl.open = false;
      } else {
        this.contentWrapper.style.height = 'auto';
      }

      if (this.pendingState !== undefined) {
        this[this.pendingState ? 'openContent' : 'closeContent']();
        this.pendingState = undefined;
      }
    }

    updateHeight() {
      if (this.detailsEl.open && !this.isAnimating) {
        this.contentWrapper.style.height = 'auto';
        const height = this.contentWrapper.scrollHeight;
        this.contentWrapper.style.height = `${height}px`;
      }
    }
    updateContentHeight() {
      if (this.detailsEl.open) {
        const height = this.contentEl.scrollHeight;
        this.contentWrapper.style.height = `${height}px`;
      }
    }

    disconnectedCallback() {
      if (this.summaryEl) {
        this.summaryEl.removeEventListener('click', this.toggleContent);
      }
    
      if (this.contentWrapper) {
        this.contentWrapper.removeEventListener('transitionend', this.onTransitionEnd);
      }
    
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
      }
    
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
    }
    setResponsiveState() {
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
    
      if (isMobile && this.detailsEl.open) {
        return;
      }
    
      this.detailsEl.open = !isMobile;
      this.detailsEl.classList.toggle('is-open', !isMobile);
    
      if (isMobile) {
        this.contentWrapper.style.height = '0';
      } else {
        this.contentWrapper.style.height = 'auto';
        this.contentEl.style.transform = 'translateY(0)';
        
        setTimeout(() => {
          const height = this.contentEl.scrollHeight;
          this.contentWrapper.style.height = `${height}px`;
        }, 0);
      }
    }
    
    
  }

  customElements.define('collapsible-details', CollapsibleDetails);
}

// Use a debounced resize handler for better performance
function debounce(func, wait = 100) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

window.addEventListener('resize', debounce(() => {
  document.querySelectorAll('collapsible-details details[data-responsive="true"]')
    .forEach(details => details.closest('collapsible-details').setResponsiveState());
}));

/**
 *  @class
 *  @function TabsComponent
 */

if (!customElements.get('tabs-component')) {
  class TabsComponent extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.tabsHeader = this.querySelector('.tabs-header');
      this.tabsContent = this.querySelector('.tabs-content');
      this.tabActiveIndicator = this.querySelector('.indicator');

      this.tabsHeader.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-button')) {
          this.activateTab(e.target);
        }
      });

      this.tabsHeader.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('tab-button')) {
          this.handleKeyDown(e);
        }
      });

      this.activateTab(this.tabsHeader.querySelector('.tab-button'));

      if (Shopify && Shopify.designMode) {
        document.addEventListener('shopify:block:select', this.handleBlockSelect.bind(this));
      }
    }

    activateTab(tab) {
      const tabIndex = tab.getAttribute('data-tab');

      this.tabsHeader.querySelectorAll('.tab-button').forEach((t) => {
        const isActive = t === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive);
        t.setAttribute('tabindex', isActive ? '0' : '-1'); 
      });

      this.tabsContent.querySelectorAll('.tab-content').forEach((content) => {
        content.classList.toggle('active', content.getAttribute('id') === tabIndex);
      });

      const tabRect = tab.getBoundingClientRect();
      const tabsHeaderRect = this.tabsHeader.getBoundingClientRect();
      const offsetLeft = tabRect.left - tabsHeaderRect.left;

      this.tabsHeader.style.setProperty('--indicator-width', `${tabRect.width}px`);
      this.tabsHeader.style.setProperty('--indicator-offset', `${offsetLeft}px`);
    }

    handleKeyDown(e) {
      const key = e.key;
      const currentTab = e.target;
      let newTab;

      switch (key) {
        case 'ArrowRight':
          newTab = currentTab.nextElementSibling || this.tabsHeader.firstElementChild;
          break;
        case 'ArrowLeft':
          newTab = currentTab.previousElementSibling || this.tabsHeader.lastElementChild;
          break;
        case 'Enter':
        case 'Space':  
          this.activateTab(currentTab);
          return;
      }

      if (newTab && newTab.classList.contains('tab-button')) {
        e.preventDefault();
        newTab.focus(); 
      }
    }

    handleBlockSelect(e) {
      const blockId = e.detail.blockId;
      const tabToActivate = this.tabsHeader.querySelector(`[data-tab="tab-${blockId}"]`);
      if (tabToActivate) {
        this.activateTab(tabToActivate);
      }
    }
  }

  customElements.define('tabs-component', TabsComponent);
}

if (!customElements.get('card-product-swatch')) {
  class CardProductSwatch extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      this.swatchButtons = this.querySelectorAll('.swatch-button');
      this.image = this.closest('.card-product').querySelector('.product-first-image img');
      this.link = this.closest('.card-product').querySelector('.product-link'); 
      this.swatchButtons.forEach((button) => {
        button.addEventListener('click', this.handleSwatchClick.bind(this));
      });
    }

    handleSwatchClick(event) {
      const button = event.currentTarget;
      this.updateActiveSwatch(button);
      this.updateProductImage(button);
      this.updateProductLink(button);
    }

    updateActiveSwatch(button) {
      this.swatchButtons.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
    }

    updateProductImage(button) {
      const newImageSrcset = button.getAttribute('data-srcset');
      const newImageSrc = button.getAttribute('data-src');
      if (newImageSrcset) {
        this.image.srcset = newImageSrcset;
      }
      if (newImageSrc) {
        this.image.src = newImageSrc;
      }
    }

    updateProductLink(button) {
      const newLink = button.getAttribute('data-link');
      if (newLink) {
        this.link.href = newLink;
      }
    }
  }

  customElements.define('card-product-swatch', CardProductSwatch);
}

/**
 *  @class
 *  @function CountdownTimer
 */

if (!customElements.get('count-down')) {
  class CountdownTimer extends HTMLElement {
      constructor() {
          super();
          this.endTime = new Date(this.getAttribute('data-timer')).getTime();
          
          // Cache DOM elements
          this.daysElem = this.querySelector('li[data-value="days"] .countdown-day');
          this.hoursElem = this.querySelector('li[data-value="hours"] .countdown-hour');
          this.minutesElem = this.querySelector('li[data-value="minutes"] .countdown-minute');
          this.secondsElem = this.querySelector('li[data-value="seconds"] .countdown-second');
      }

      connectedCallback() {
          this.startCountdown();
      }

      startCountdown() {
          const updateCountdown = () => {
              const now = new Date().getTime();
              const distance = this.endTime - now;

              if (distance < 0) {
                  this.displayTime(0, 0, 0, 0);
                  return;
              }

              const days = Math.floor(distance / (1000 * 60 * 60 * 24));
              const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
              const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((distance % (1000 * 60)) / 1000);

              this.displayTime(days, hours, minutes, seconds);

              // Request the next frame
              requestAnimationFrame(updateCountdown);
          };

          updateCountdown(); // Start the countdown
      }

      displayTime(days, hours, minutes, seconds) {
          this.daysElem.textContent = days;
          this.hoursElem.textContent = hours;
          this.minutesElem.textContent = minutes;
          this.secondsElem.textContent = seconds;
      }
  }

  customElements.define('count-down', CountdownTimer);
}

(function() {
  function getAbsoluteTop(element) {
    if (!element) return 0;
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return rect.top + scrollTop;
  }

  function initSmoothScroll() {
    document.addEventListener('click', function(event) {
      if (event.target.matches('[data-anchor]')) {
        event.preventDefault();
        
        const href = event.target.getAttribute('href');
        if (!href || href === '#') return;
        
        const targetId = href.replace('#', '');
        const targetSection = document.getElementById(targetId);
        
        if (targetSection) {
          const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
          const targetPosition = getAbsoluteTop(targetSection) - headerHeight;
          
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  }

  // Init when DOM is ready
  document.addEventListener('DOMContentLoaded', initSmoothScroll);
})();

if (!customElements.get('show-more-toggle')) {
  customElements.define(
    'show-more-toggle',
    class ShowMoreToggle extends HTMLElement {
      constructor() {
        super();
        this.content = this.querySelector('[data-show-more-content]');
        this.button = this.querySelector('button');
        this.showMoreText = this.querySelector('.label-show-more');
        this.showLessText = this.querySelector('.label-show-less');

        this.button.addEventListener('click', () => this.toggle());
      }

      toggle() {
        this.content.classList.toggle('content-truncated');
        this.showMoreText.classList.toggle('hidden');
        this.showLessText.classList.toggle('hidden');
      }
    }
  );
}
