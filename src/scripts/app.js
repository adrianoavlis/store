import '../styles/main.css';

const DATA_SOURCES = {
  config: '/data/config.json',
  instagram: '/data/instagram.json',
  products: '/data/products.json'
};

const DEFAULTS = {
  whatsappTemplate: 'Olá, tenho interesse no produto {{title}} (link: {{url}}). Poderia informar preço e disponibilidade?',
  cardsPerRowMobile: 1,
  cardsPerRowTablet: 2,
  cardsPerRowDesktop: 3
};

const state = {
  products: [],
  activeFilter: 'tudo'
};

const dom = {
  app: document.getElementById('app'),
  title: document.getElementById('store-title'),
  subtitle: document.getElementById('store-subtitle'),
  logo: document.getElementById('store-logo'),
  socialNav: document.getElementById('social-nav'),
  highlight: document.getElementById('highlight'),
  productGrid: document.getElementById('product-grid'),
  filters: document.getElementById('filters'),
  instagramGrid: document.getElementById('instagram-grid'),
  footer: document.getElementById('site-footer')
};

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar ${url} (${response.status})`);
  }

  return response.json();
}

function sanitisePhone(number) {
  return typeof number === 'string' ? number.replace(/\D/g, '') : '';
}

function buildSocialLinks(config) {
  const links = Array.isArray(config.social) ? [...config.social] : [];

  if (config.whatsappNumber) {
    const phone = sanitisePhone(config.whatsappNumber);
    if (phone) {
      links.unshift({
        label: config.whatsappLabel ?? 'WhatsApp',
        url: `https://wa.me/${phone}`
      });
    }
  }

  if (config.instagramProfile) {
    const igUrl = config.instagramProfile.startsWith('http')
      ? config.instagramProfile
      : `https://www.instagram.com/${config.instagramProfile.replace(/^@/, '')}/`;

    links.push({
      label: config.instagramLabel ?? 'Instagram',
      url: igUrl
    });
  }

  return links;
}

function renderSocialLinks(socialLinks = []) {
  dom.socialNav.innerHTML = '';

  socialLinks.forEach((item) => {
    if (!item?.url) return;

    const link = document.createElement('a');
    link.href = item.url;
    link.textContent = item.label ?? item.url;
    link.target = '_blank';
    link.rel = 'noopener';
    dom.socialNav.appendChild(link);
  });
}

function renderHighlight(highlight) {
  if (!highlight) {
    dom.highlight.remove();
    return;
  }

  dom.highlight.innerHTML = '';

  const content = document.createElement('div');
  content.className = 'highlight__content';

  if (highlight.eyebrow) {
    const eyebrow = document.createElement('span');
    eyebrow.className = 'highlight__eyebrow';
    eyebrow.textContent = highlight.eyebrow;
    content.appendChild(eyebrow);
  }

  if (highlight.title) {
    const heading = document.createElement('h2');
    heading.className = 'highlight__title';
    heading.textContent = highlight.title;
    content.appendChild(heading);
  }

  if (highlight.description) {
    const description = document.createElement('p');
    description.className = 'highlight__description';
    description.textContent = highlight.description;
    content.appendChild(description);
  }

  if (highlight.ctaLabel && highlight.ctaUrl) {
    const ctaWrapper = document.createElement('div');
    ctaWrapper.className = 'highlight__cta';
    const button = document.createElement('a');
    button.href = highlight.ctaUrl;
    button.textContent = highlight.ctaLabel;
    button.className = 'button';
    button.target = '_blank';
    button.rel = 'noopener';
    ctaWrapper.appendChild(button);
    content.appendChild(ctaWrapper);
  }

  dom.highlight.appendChild(content);

  if (highlight.image) {
    const media = document.createElement('div');
    media.className = 'highlight__media';
    const image = document.createElement('img');
    image.src = highlight.image;
    image.alt = highlight.imageAlt ?? highlight.title ?? 'Imagem em destaque';
    media.appendChild(image);
    dom.highlight.appendChild(media);
  }
}

function buildFilterChips(products) {
  const categories = new Set(['tudo']);
  products.forEach((product) => {
    if (Array.isArray(product.tags)) {
      product.tags.forEach((tag) => categories.add(tag));
    }
  });

  dom.filters.innerHTML = '';

  categories.forEach((category) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.category = category;
    button.className = 'filter-chip' + (category === state.activeFilter ? ' is-active' : '');
    button.textContent = category === 'tudo' ? 'Tudo' : category;
    button.addEventListener('click', () => {
      state.activeFilter = category;
      updateFilterState();
    });
    dom.filters.appendChild(button);
  });
}

function updateFilterState() {
  buildFilterChips(state.products);
  renderProductGrid();
}

function formatPrice(value) {
  if (typeof value !== 'number') {
    return value;
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatWhatsappMessage(template, product) {
  const data = {
    title: product.title ?? product.name ?? 'produto',
    url: product.url ?? product.permalink ?? window.location.href
  };

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => data[key] ?? '');
}

function createWhatsappUrl(config, product) {
  if (!config.whatsappNumber) return null;
  const template = formatWhatsappMessage(
    config.whatsappTemplate ?? DEFAULTS.whatsappTemplate,
    product
  );
  const phone = sanitisePhone(config.whatsappNumber);
  if (!phone) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(template)}`;
}

function normaliseProducts(rawProducts, config) {
  if (!Array.isArray(rawProducts)) return [];

  return rawProducts.map((product) => {
    const title = product.title ?? product.name ?? 'Produto delicioso';
    const description = product.description ?? '';
    const image = product.image ?? product.media_url ?? '';
    const alt = product.imageAlt ?? product.alt ?? title;
    const url = product.url ?? product.permalink ?? '';
    const price = typeof product.price === 'number' ? product.price : product.price ?? null;
    const tags = Array.isArray(product.tags)
      ? product.tags
      : product.category
        ? [product.category]
        : [];

    const whatsappUrl = createWhatsappUrl(config, { ...product, title, url });

    return {
      ...product,
      title,
      description,
      image,
      alt,
      url,
      price,
      tags,
      ctaUrl: product.ctaUrl ?? whatsappUrl ?? url,
      ctaLabel: product.ctaLabel ?? 'Pedir no WhatsApp'
    };
  });
}

function renderProductGrid() {
  const template = document.getElementById('product-card-template');
  dom.productGrid.innerHTML = '';

  const productsToRender = state.activeFilter === 'tudo'
    ? state.products
    : state.products.filter((product) => product.tags?.includes(state.activeFilter));

  if (productsToRender.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Nenhum produto disponível nessa categoria no momento.';
    dom.productGrid.appendChild(empty);
    return;
  }

  productsToRender.forEach((product) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const image = node.querySelector('.product-card__image');
    const title = node.querySelector('.product-card__title');
    const description = node.querySelector('.product-card__description');
    const price = node.querySelector('.product-card__price');
    const cta = node.querySelector('.product-card__cta');

    image.src = product.image;
    image.alt = product.alt;
    title.textContent = product.title;
    description.textContent = product.description;
    price.textContent = formatPrice(product.price);

    if (product.ctaUrl) {
      cta.href = product.ctaUrl;
      cta.textContent = product.ctaLabel;
    } else {
      cta.remove();
    }

    dom.productGrid.appendChild(node);
  });
}

function renderInstagramFeed(posts = []) {
  const template = document.getElementById('instagram-card-template');
  dom.instagramGrid.innerHTML = '';

  if (!posts.length) {
    const message = document.createElement('p');
    message.textContent = 'Em breve novidades no Instagram!';
    dom.instagramGrid.appendChild(message);
    return;
  }

  posts.forEach((post) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.href = post.permalink ?? post.url;
    const image = node.querySelector('.instagram-card__image');
    image.src = post.media_url ?? post.image;
    image.alt = post.alt ?? post.caption ?? 'Publicação do Instagram';
    node.querySelector('.instagram-card__caption').textContent = post.caption ?? '';
    dom.instagramGrid.appendChild(node);
  });
}

function renderFooter(footer) {
  if (!footer) {
    dom.footer.remove();
    return;
  }

  dom.footer.textContent = footer;
}

function applyGridPreferences(config) {
  const mobile = config.cardsPerRowMobile ?? DEFAULTS.cardsPerRowMobile;
  const tablet = config.cardsPerRowTablet ?? DEFAULTS.cardsPerRowTablet;
  const desktop = config.cardsPerRowDesktop ?? DEFAULTS.cardsPerRowDesktop;

  dom.productGrid.style.setProperty('--grid-columns-mobile', mobile);
  dom.productGrid.style.setProperty('--grid-columns-tablet', tablet);
  dom.productGrid.style.setProperty('--grid-columns-desktop', desktop);
}

async function bootstrap() {
  try {
    const [config, instagram, products] = await Promise.all([
      fetchJSON(DATA_SOURCES.config),
      fetchJSON(DATA_SOURCES.instagram),
      fetchJSON(DATA_SOURCES.products)
    ]);

    const brand = config.brandName ?? config.title ?? document.title;
    document.title = brand;
    dom.title.textContent = brand ?? '';
    dom.subtitle.textContent = config.tagline ?? config.subtitle ?? '';
    if (config.logo) {
      dom.logo.src = config.logo;
    }
    dom.logo.alt = config.logoAlt ?? 'Logotipo da loja';

    renderSocialLinks(buildSocialLinks(config));
    renderHighlight(config.highlight);
    applyGridPreferences(config);

    state.products = normaliseProducts(products, config);
    buildFilterChips(state.products);
    renderProductGrid();

    const instagramPosts = Array.isArray(instagram)
      ? instagram.map((post) => ({
        ...post,
        permalink: post.permalink ?? post.url,
        media_url: post.media_url ?? post.image
      }))
      : [];
    renderInstagramFeed(instagramPosts);
    renderFooter(config.footer);
  } catch (error) {
    console.error(error);
    dom.app?.insertAdjacentHTML(
      'beforeend',
      '<p class="error">Não foi possível carregar o conteúdo. Tente novamente mais tarde.</p>'
    );
  }
}

bootstrap();
