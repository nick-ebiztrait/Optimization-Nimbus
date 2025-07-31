class CartCheckboxUpsell {
  constructor(cartItemsInstance) {
    this.cartItemsInstance = cartItemsInstance;
    this.baseUrl = '/cart';
    this.checkboxUpsellVariantId = this.getUpsellCheckboxVariantId();
    this.initEventDelegation();
    document.addEventListener('cartUpdated', this.handleCartUpdate.bind(this));
    this.updateCheckboxState();
  }

  initEventDelegation() {
    document.body.addEventListener('change', (event) => {
      if (event.target.id === 'cart-upsell-checkbox') {
        const isChecked = event.target.checked;
        if (isChecked) {
          this.addUpsellCheckboxToCart();
        } else {
          this.removeUpsellCheckboxFromCart();
        }
      }
    });
  }

  getUpsellCheckboxVariantId() {
    return document.querySelector('#cart-upsell-checkbox')?.getAttribute('data-variant-id');
  }

  updateCheckboxState() {
    fetch(`${this.baseUrl}.js`)
      .then(response => response.json())
      .then(cart => {
        const hasUpsellCheckbox = cart.items.some(item => item.variant_id.toString() === this.checkboxUpsellVariantId);
        const checkboxUpsellCheckbox = document.querySelector('#cart-upsell-checkbox');
        if (checkboxUpsellCheckbox) {
          checkboxUpsellCheckbox.checked = hasUpsellCheckbox;
        }
      })
      .catch(error => {
        console.error('Error fetching cart:', error);
      });
  }

  handleCartUpdate() {
    setTimeout(() => this.updateCheckboxState(), 500); 
  }

  addUpsellCheckboxToCart() {
    const formData = new FormData();
    formData.append('id', this.checkboxUpsellVariantId);
    formData.append('quantity', 1);

    fetch(`${this.baseUrl}/add.js`, {
      method: 'POST',
      body: formData
    })
    .then(response => {
      if (response.ok) {
        if (this.cartItemsInstance && typeof this.cartItemsInstance.onCartUpdate === 'function') {
          this.cartItemsInstance.onCartUpdate();
          this.onCartUpdateCheckboxUpsell();
        }
      }
      return response.json();
    })
    .catch(error => {
      console.error('Error adding cart upsell:', error);
    });
  }

  removeUpsellCheckboxFromCart() {
    fetch('/cart.js')
      .then(response => response.json())
      .then(cart => {
        const lineItemIndex = cart.items.findIndex(item => item.variant_id.toString() === this.checkboxUpsellVariantId);
        if (lineItemIndex !== -1) {
          const line = lineItemIndex + 1;
          this.cartItemsInstance.updateQuantity(line, 0, null, null);
        } else {
          console.error('Cart upsell product not found in cart.');
        }
      })
      .catch(error => {
        console.error('Error fetching cart for cart upsell removal:', error);
      });
  }

getSectionsToRenderCheckboxUpsell() {
  const mainCartFooter = document.getElementById('main-cart-footer');
  const sections = [
    ...(mainCartFooter ? [{
      id: 'main-cart-footer',
      section: mainCartFooter.dataset.id,
      selector: '#main-cart-footer .js-contents',
    }] : []),
    {
      id: 'cart-icon-bubble',
      section: 'cart-icon-bubble',
      selector: '#cart-icon-bubble',
    },
  ];
  return sections;
}

  
  onCartUpdateCheckboxUpsell() {
    this.getSectionsToRenderCheckboxUpsell().forEach(section => {
      fetch(`${routes.cart_url}?section_id=${section.section}`)
        .then(response => response.text())
        .then(html => {
          const container = document.querySelector(section.selector);
          if (!container) {
            console.error(`Container not found for selector: ${section.selector}`);
            return;
          }
          if (section.id === 'main-cart-footer') {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const jsContents = doc.querySelector('.js-contents');
  
            if (jsContents) {
              container.innerHTML = jsContents.innerHTML;
            } else {
              console.error(`.js-contents not found in fetched HTML for section: ${section.id}`);
            }
          } 
          else if (section.id === 'cart-icon-bubble') {
            container.innerHTML = html;
          }
        })
        .catch(error => console.error(`Error updating section ${section.id}:`, error));
    });
  }
  
}

document.addEventListener('DOMContentLoaded', function() {
    const cartItemsInstance = document.querySelector('cart-items');
    const cartDrawerItemsInstance = document.querySelector('cart-drawer-items');
    let activeCartInstance = cartDrawerItemsInstance || cartItemsInstance; 
    if (activeCartInstance) {
        new CartCheckboxUpsell(activeCartInstance);
    } else {
        console.log("Neither cart-items nor cart-drawer-items found in the DOM.");
    }
});

