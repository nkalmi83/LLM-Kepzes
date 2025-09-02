document.addEventListener('DOMContentLoaded', function() {
    const productGrid = document.getElementById('product-grid');
    const addProductBtn = document.getElementById('add-product-btn');
    const productModal = document.getElementById('product-modal');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveProductBtn = document.getElementById('save-product-btn');
    const productForm = document.getElementById('product-form');
    const modalTitle = document.getElementById('modal-title');
    const searchInput = document.getElementById('search-input');

    const viewProductModal = document.getElementById('view-product-modal');
    const closeViewBtn = document.getElementById('close-view-btn');
    const viewProductContent = document.getElementById('view-product-content');

    const deleteProductModal = document.getElementById('delete-product-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    let currentProductId = null;

    const fetchProducts = async (searchTerm = '') => {
        try {
            const response = await fetch(`/products/?q=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const products = await response.json();
            renderProducts(products);
        } catch (error) {
            console.error('Failed to fetch products:', error);
        }
    };

    const renderProducts = (products) => {
        productGrid.innerHTML = '';
        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'bg-white border rounded-lg p-4 flex flex-col';
            card.innerHTML = `
                <h3 class="text-lg font-semibold mb-2">${product.name}</h3>
                <p class="text-gray-600 mb-4 flex-grow">${product.description}</p>
                <div class="flex justify-between items-center mb-4">
                    <span class="text-gray-600">Stock: ${product.stock}</span>
                    <span class="text-lg font-bold text-black">$${product.price.toFixed(2)}</span>
                </div>
                <div class="flex justify-end space-x-2">
                    <button class="view-btn border border-gray-300 rounded-md px-3 py-1 text-sm" data-id="${product.id}">View</button>
                    <button class="edit-btn border border-gray-300 rounded-md px-3 py-1 text-sm" data-id="${product.id}">Edit</button>
                    <button class="delete-btn bg-red-600 text-white rounded-md px-3 py-1 text-sm" data-id="${product.id}">Delete</button>
                </div>
            `;
            productGrid.appendChild(card);
        });
    };

    const openModal = (product = null) => {
        productForm.reset();
        if (product) {
            modalTitle.textContent = 'Edit Product';
            document.getElementById('product-id').value = product.id;
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-description').value = product.description;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-stock').value = product.stock;
        } else {
            modalTitle.textContent = 'Add Product';
            document.getElementById('product-id').value = '';
        }
        productModal.classList.remove('hidden');
    };

    const closeModal = () => {
        productModal.classList.add('hidden');
    };

    const openViewModal = (product) => {
        viewProductContent.innerHTML = `
            <h4 class="text-xl font-bold mb-2">${product.name}</h4>
            <p class="text-gray-700 mb-4">${product.description}</p>
            <hr class="my-4">
            <div class="flex justify-between mb-2">
                <span class="font-medium">Price:</span>
                <span class="font-bold text-lg">$ ${product.price.toFixed(2)}</span>
            </div>
            <div class="flex justify-between mb-2">
                <span class="font-medium">Stock:</span>
                <span>${product.stock} units</span>
            </div>
            <div class="flex justify-between">
                <span class="font-medium">Product ID:</span>
                <span>${product.id}</span>
            </div>
        `;
        viewProductModal.classList.remove('hidden');
    };

    const closeViewModal = () => {
        viewProductModal.classList.add('hidden');
    };

    const openDeleteModal = (id) => {
        currentProductId = id;
        deleteProductModal.classList.remove('hidden');
    };

    const closeDeleteModal = () => {
        deleteProductModal.classList.add('hidden');
        currentProductId = null;
    };

    const saveProduct = async () => {
        const id = document.getElementById('product-id').value;
        const productData = {
            name: document.getElementById('product-name').value,
            description: document.getElementById('product-description').value,
            price: parseFloat(document.getElementById('product-price').value),
            stock: parseInt(document.getElementById('product-stock').value, 10),
        };

        if (!productData.name || !productData.description || isNaN(productData.price) || isNaN(productData.stock)) {
            alert('Please fill in all fields correctly.');
            return;
        }

        const url = id ? `/products/${id}` : '/products/';
        const method = id ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(productData),
            });

            if (!response.ok) {
                throw new Error('Failed to save product');
            }
            closeModal();
            fetchProducts(searchInput.value);
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    const deleteProduct = async () => {
        if (!currentProductId) return;

        try {
            const response = await fetch(`/products/${currentProductId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete product');
            }
            closeDeleteModal();
            fetchProducts(searchInput.value);
        } catch (error) {
            console.error('Error deleting product:', error);
        }
    };

    addProductBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);
    saveProductBtn.addEventListener('click', saveProduct);
    closeViewBtn.addEventListener('click', closeViewModal);
    cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    confirmDeleteBtn.addEventListener('click', deleteProduct);

    productGrid.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        try {
            const response = await fetch(`/products/${id}`);
            if (!response.ok) {
                throw new Error('Could not fetch product details');
            }
            const product = await response.json();

            if (e.target.classList.contains('edit-btn')) {
                openModal(product);
            } else if (e.target.classList.contains('view-btn')) {
                openViewModal(product);
            } else if (e.target.classList.contains('delete-btn')) {
                openDeleteModal(id);
            }
        } catch (error) {
            console.error('Error handling product action:', error);
        }
    });

    searchInput.addEventListener('input', (e) => {
        fetchProducts(e.target.value);
    });

    // Initial fetch
    fetchProducts();
});
