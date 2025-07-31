class CustomPagination extends HTMLElement {
  constructor() {
    super();
    this.initializeProperties();
  }

  initializeProperties() {
    this.sectionId = this.dataset.section;
    this.productList = document.querySelector(`ul[data-id="${this.sectionId}"]`);
    this.loadMoreButton = this.querySelector('.btn--load-more');
    this.paginationType = this.getAttribute('data-type');
    this.countItem = parseInt(this.productList.getAttribute('data-products-count'), 10);
    this.currentPage = 2;
    this.scrollObserver = null;
  }

  connectedCallback() {
    if (this.paginationType === 'load-more-button') {
      this.setupLoadMoreButton();
    } else if (this.paginationType === 'infinite-scroll') {
      this.setupInfiniteScroll();
    }
  }

  setupLoadMoreButton() {
    if (this.loadMoreButton) {
      this.loadMoreButton.addEventListener('click', () => this.loadNextPage());
    }
  }

  setupInfiniteScroll() {
    this.scrollObserver = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) this.loadNextPage();
      }, 
      { threshold: [0, 1] }
    );
    this.scrollObserver.observe(this);
  }

  buildUrlWithPageNumber(search, key) {
    const urlParams = new URLSearchParams(search || '');
    urlParams.set(key, this.currentPage);
    return `?${urlParams.toString()}`;
  }

  async loadNextPage() {
    if (this.hasAttribute('loading')) return;

    try {
      this.setAttribute('loading', true);
      this.showLoadingSpinner();
      
      const url = `${document.location.pathname}${this.buildUrlWithPageNumber(document.location.search, 'page')}`;
      const response = await fetch(url);
      const html = await response.text();
      
      this.renderFetchedProducts(html);
      this.currentPage++;
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      this.hideLoadingSpinner();
      this.removeAttribute('loading');
    }
  }

  renderFetchedProducts(html) {
    const parser = new DOMParser();
    const newDocument = parser.parseFromString(html, 'text/html');
    const newProductGrid = newDocument.getElementById('product-grid');
    
    if (!newProductGrid || !newProductGrid.children.length) {
      this.finalizePagination();
      return;
    }

    const newProducts = newProductGrid.querySelectorAll('.grid__item');
    newProducts.forEach(product => this.productList.appendChild(product));

    if (this.productList.children.length >= this.countItem) {
      this.finalizePagination();
    }
  }

  showLoadingSpinner() {
    if (!this.loadMoreButton) return;
    
    this.loadMoreButton.classList.add('loading');
    const spinner = this.loadMoreButton.querySelector('.loading__spinner');
    if (spinner) spinner.classList.remove('hidden');
  }

  hideLoadingSpinner() {
    if (!this.loadMoreButton) return;
    
    this.loadMoreButton.classList.remove('loading');
    const spinner = this.loadMoreButton.querySelector('.loading__spinner');
    if (spinner) spinner.classList.add('hidden');
  }

  finalizePagination() {
    if (this.scrollObserver) {
      this.scrollObserver.unobserve(this);
      this.scrollObserver.disconnect();
    }
    
    if (this.loadMoreButton) {
      this.loadMoreButton.classList.add('visually-hidden');
    }
  }

  disconnectedCallback() {
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
    }
    
    if (this.loadMoreButton) {
      this.loadMoreButton.removeEventListener('click', this.loadNextPage);
    }
  }
}

if (!customElements.get('custom-pagination')) {
  customElements.define('custom-pagination', CustomPagination);
}