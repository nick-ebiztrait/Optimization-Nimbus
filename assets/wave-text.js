if (!customElements.get('wave-text')) {
  class WaveText extends HTMLElement {
    constructor() {
      super();
      this.scrollHandler = this.updateScroll.bind(this);
      this.resizeHandler = this.onResize.bind(this);
      this.observeHandler = this.onIntersect.bind(this);
      this.isMobile = window.innerWidth <= 768;
      this.isVisible = false;
      this.active = false;
    }

    connectedCallback() {
      this.textPath = this.querySelector('textPath');
      if (!this.textPath) return;

      const href = this.textPath.getAttribute('href') || this.textPath.getAttribute('xlink:href');
      this.path = this.querySelector(href);
      if (!this.path) return;

      this.speed = parseFloat(this.dataset.speed) || 20;
      this.direction = this.dataset.direction === 'reverse' ? -1 : 1;
      this.trigger = this.dataset.trigger || 'scroll';
      this.pathLength = this.path.getTotalLength();

      this.observer = new IntersectionObserver(this.observeHandler, { threshold: 0.01 });
      this.observer.observe(this);
      window.addEventListener('resize', this.resizeHandler);

      if (!this.isMobile) this.start();
    }

    disconnectedCallback() {
      this.stop();
      this.observer.disconnect();
      window.removeEventListener('resize', this.resizeHandler);
    }

    onResize() {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 768;
      if (wasMobile !== this.isMobile) {
        this.isMobile ? this.stop() : this.isVisible && this.start();
      }
    }

    onIntersect(entries) {
      this.isVisible = entries[0].isIntersecting;
      this.isVisible && !this.isMobile ? this.start() : this.stop();
    }

    start() {
      if (this.active || this.trigger === 'static') return;
      this.active = true;
    
      if (this.trigger === 'scroll') {
        window.addEventListener('scroll', this.scrollHandler);
        this.updateScroll();
      } else if (this.trigger === 'marquee') {
        this.offset = 0;
        this.loop = requestAnimationFrame(() => this.updateMarquee());
      }
    }


    stop() {
      if (!this.active) return;
      this.active = false;
      window.removeEventListener('scroll', this.scrollHandler);
      cancelAnimationFrame(this.loop);
      this.loop = null;
    }

    updateScroll() {
      const st = window.scrollY;
      const sh = document.documentElement.scrollHeight;
      const ch = window.innerHeight;
      const percent = st / (sh - ch);
      const offset = 0.5 * this.pathLength + percent * this.speed * this.pathLength * this.direction;
      if (offset !== this.lastOffset) {
        this.textPath.setAttribute('startOffset', offset);
        this.lastOffset = offset;
      }
    }

    updateMarquee() {
      this.offset = (this.offset || 0) + this.direction * this.speed;
      if (this.offset > this.pathLength) this.offset = 0;
      if (this.offset < 0) this.offset = this.pathLength;
      if (this.offset !== this.lastOffset) {
        this.textPath.setAttribute('startOffset', this.offset);
        this.lastOffset = this.offset;
      }
      this.loop = requestAnimationFrame(() => this.updateMarquee());
    }
  }

  customElements.define('wave-text', WaveText);
}
