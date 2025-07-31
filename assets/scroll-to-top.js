if (!customElements.get("scroll-to-top")) {
  class ScrollToTop extends HTMLElement {
    constructor() {
      super();
      this.triggerHeight  = window.innerHeight;
      this.handleScrollEvent = this.toggleVisibility.bind(this);
    }

    connectedCallback() {
      this.addEventListener("click", this.scrollToTopHandler);
      window.addEventListener("scroll", this.handleScrollEvent);
      this.toggleVisibility();
    }

    disconnectedCallback() {
      this.removeEventListener("click", this.scrollToTopHandler);
      window.removeEventListener("scroll", this.handleScrollEvent);
    }

    toggleVisibility() {
      const isButtonVisible = window.scrollY > this.triggerHeight;
      this.classList.toggle("scroll-to-top--visible", isButtonVisible);
    }

    scrollToTopHandler() {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  customElements.define("scroll-to-top", ScrollToTop);
}
