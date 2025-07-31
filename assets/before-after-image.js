if (!customElements.get('before-after-image')) {
  class BeforeAfterImage extends HTMLElement {
    constructor() {
      super();
      this.slider = this.querySelector('.slider');
      this.afterImage = this.querySelector('.before-after-image.after');
      this.container = this.querySelector('.before-after-container');
    }
  
    connectedCallback() {
      this.observeVisibility();
    }
  
    initSlider() {
      const moveSliderToCenter = () => {
        const containerRect = this.container.getBoundingClientRect();
        const centerPosition = containerRect.width / 2;
        
        requestAnimationFrame(() => {
          this.container.classList.add('transition');
          this.container.style.setProperty('--slider-position', `${centerPosition}px`);
          this.container.style.setProperty('--clip-path-percent', '50%');
        });
      };
    
      const onMouseMove = (e) => {
        const containerRect = this.container.getBoundingClientRect();
        let position = e.clientX - containerRect.left;
        let width = containerRect.width;
    
        if (position < 0) position = 0;
        if (position > width) position = width;
    
        this.container.classList.remove('transition');
        this.container.style.setProperty('--slider-position', `${position}px`);
        this.container.style.setProperty('--clip-path-percent', `${(position / width) * 100}%`);
      };
    
      const onTouchMove = (e) => {
        const touch = e.touches[0];
        onMouseMove(touch);
      };
    
      const onClick = (e) => {
        const containerRect = this.container.getBoundingClientRect();
        let position = e.clientX - containerRect.left;
        let width = containerRect.width;
    
        if (position < 0) position = 0;
        if (position > width) position = width;
        this.container.classList.remove('transition');
        this.container.classList.add('transition-faster');
        this.container.style.setProperty('--slider-position', `${position}px`);
        this.container.style.setProperty('--clip-path-percent', `${(position / width) * 100}%`);
        setTimeout(() => {
          this.container.classList.remove('transition-faster');
        }, 150);
      };

      this.container.addEventListener('transitionend', () => {
        this.container.classList.remove('transition');
      });
    
      this.slider.addEventListener('mousedown', () => {
        document.addEventListener('mousemove', onMouseMove);
      });
    
      this.slider.addEventListener('touchstart', () => {
        document.addEventListener('touchmove', onTouchMove);
      });
    
      this.container.addEventListener('click', onClick);
    
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMouseMove);
      });
    
      document.addEventListener('touchend', () => {
        document.removeEventListener('touchmove', onTouchMove);
      });
    
      setTimeout(() => {
        moveSliderToCenter();
      }, 100);
    }
  
    observeVisibility() {
      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.initSlider();
            observer.unobserve(this.container); 
          }
        });
      }, { threshold: 0 });
  
      observer.observe(this.container);
    }
  }
  
  customElements.define('before-after-image', BeforeAfterImage);
}
