// Modal Drawer class
class ModalDrawer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: none;
          z-index: 1000;
        }
        
        :host([open]) {
          display: block;
        }
        
        .modal-drawer-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(1px);
          opacity: 0;
          transition: opacity var(--duration-medium, 0.3s) ease;
          pointer-events: none;
        }
        
        :host([open]) .modal-drawer-overlay {
          opacity: 1;
          pointer-events: auto;
        }
        
        .modal-drawer__content {
          position: fixed;
          bottom: 0;
          left: 0;
          width: 100%;
          background: rgb(var(--color-drawer-background));
          transform: translateY(100%);
          transition: transform var(--duration-medium, 0.3s) ease;
          z-index: 1001;
          padding: 30px;
          box-sizing: border-box;
        }

        :host([open]) .modal-drawer__content {
          transform: translateY(0);
        }

        @media (max-width: 768px) {
          .modal-drawer__content {
            padding: 20px 20px 30px 20px;
          }
        }
      </style>
      <div class="modal-drawer-overlay"></div>
      <div class="modal-drawer__content">
        <slot></slot>
      </div>
    `;
    
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  connectedCallback() {
    this.overlay = this.shadowRoot.querySelector('.modal-drawer-overlay');
    this.content = this.shadowRoot.querySelector('.modal-drawer__content');
    this.closeButtons = this.querySelectorAll('.close-modal-drawer');
    
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    
    this.overlay.addEventListener('click', () => this.close());
    this.closeButtons.forEach(button => button.addEventListener('click', () => this.close()));
    
    if (this.hasAttribute('open')) {
      this.open();
    } else {
      this.close();
    }
  }

  open() {
    this.style.display = 'block';
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.setAttribute('open', '');
        document.addEventListener('keydown', this.handleKeyDown);
      }, 10);
    });
  }
  

  close() {
    this.removeAttribute('open');
    document.removeEventListener('keydown', this.handleKeyDown);

    setTimeout(() => {
      this.style.display = 'none';
    }, 300);
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      this.close();
    }
  }

  static get observedAttributes() {
    return ['open'];
  }
}

customElements.define('modal-drawer', ModalDrawer);

// Modal Trigger class
class ModalTrigger extends DrawerButton {
  constructor() {
    super();
  }

  // Override handleClick to ensure it specifically handles modal behavior
  handleClick() {
    if (this.targetDrawer && this.targetDrawer instanceof ModalDrawer) {
      this.targetDrawer.open();
    }
  }
}

customElements.define('modal-trigger', ModalTrigger);