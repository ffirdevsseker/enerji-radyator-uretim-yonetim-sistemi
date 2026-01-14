// Header Component JavaScript
document.addEventListener('DOMContentLoaded', function() {
    loadHeader();
    initializeNavigation();
    initializeLogout();
});

// Load header HTML
async function loadHeader() {
    try {
        // Determine the correct path based on current location
        const currentPath = window.location.pathname;
        let headerPath = '../components/header.html';
        
        // If we're at root or in a non-pages directory, use /components/header.html
        if (currentPath === '/' || currentPath === '/login' || currentPath === '/kayitlar' || currentPath === '/maliyet-dosyalari' || currentPath === '/islemler' || currentPath === '/uretim') {
            headerPath = '/components/header.html';
        }
        
        const response = await fetch(headerPath);
        const headerHTML = await response.text();
        document.getElementById('header-container').innerHTML = headerHTML;
        
        // Initialize mobile menu after header is loaded
        initializeMobileMenu();
        highlightCurrentPage();
        initializeLogout();
    } catch (error) {
        console.error('Error loading header:', error);
    }
}

// Initialize logout functionality
function initializeLogout() {
    // Use event delegation since the button might not exist yet
    document.addEventListener('click', function(e) {
        const target = e.target.closest('#logoutBtn, .logout-link');
        if (target) {
            e.preventDefault();
            handleLogout();
        }
    });
}

// Handle logout
function handleLogout() {
    // Clear any stored authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Redirect to login page
    window.location.href = '/login';
}

// Initialize navigation functionality
function initializeNavigation() {
    // Handle navigation clicks
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('nav-link')) {
            e.preventDefault();
            const href = e.target.getAttribute('href');
            navigateToPage(href);
        }
    });
}

// Navigate to page
function navigateToPage(path) {
    // Remove leading slash for consistency
    const cleanPath = path.replace(/^\//, '');
    
    // Update URL without page reload
    history.pushState(null, '', path);
    
    // Load the appropriate page content
    loadPageContent(cleanPath || 'kayitlar');
}

// Load page content
async function loadPageContent(page) {
    try {
        // Show loading state
        showPageLoading();
        
        // Construct page path
        const pagePath = page === 'kayitlar' || page === '' ? 'pages/kayitlar.html' : `pages/${page}.html`;
        
        // Redirect to the page (for now, we'll use full page reload)
        // In a more advanced SPA setup, you would load content dynamically
        window.location.href = `/${page}`;
        
    } catch (error) {
        console.error('Error loading page:', error);
        showErrorMessage('Sayfa yüklenirken bir hata oluştu.');
    }
}

// Initialize mobile menu
function initializeMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navMenu = document.getElementById('navMenu');
    
    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!mobileMenuBtn.contains(e.target) && !navMenu.contains(e.target)) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
        
        // Close mobile menu when window is resized to desktop
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                mobileMenuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }
}

// Highlight current page in navigation
function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        const linkPath = link.getAttribute('href');
        link.classList.remove('active');
        
        // Check if this is the current page
        if (
            (currentPath === '/' && linkPath === '/') ||
            (currentPath !== '/' && linkPath === currentPath) ||
            (currentPath.includes(linkPath) && linkPath !== '/')
        ) {
            link.classList.add('active');
        }
    });
}

// Show page loading state
function showPageLoading() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.opacity = '0.5';
        mainContent.style.pointerEvents = 'none';
    }
}

// Hide page loading state
function hidePageLoading() {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.style.opacity = '1';
        mainContent.style.pointerEvents = 'auto';
    }
}

// Show error message
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'message error';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
}

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'message success';
    successDiv.textContent = message;
    
    const container = document.querySelector('.container');
    if (container) {
        container.insertBefore(successDiv, container.firstChild);
        
        // Remove success message after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 5000);
    }
}

// Smooth scroll to element
function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', function(e) {
    const path = window.location.pathname.replace('/', '') || 'kayitlar';
    loadPageContent(path);
    highlightCurrentPage();
});

// Utility function to make API calls
async function apiCall(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
    const response = await fetch(`/api/${endpoint}`, finalOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API call failed');
        }
        
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Export functions for use in other scripts
window.HeaderJS = {
    navigateToPage,
    showSuccessMessage,
    showErrorMessage,
    apiCall,
    scrollToElement
};