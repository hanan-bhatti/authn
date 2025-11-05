document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const confirmInput = document.getElementById('confirmText');
    const deleteBtn = document.getElementById('deleteBtn');
    const form = document.getElementById('deletionForm');
    const loading = document.getElementById('loading');

    // Check if elements exist (for deletion confirmation page)
    if (confirmInput && deleteBtn && form && loading) {
        // Enable delete button only when correct text is entered
        confirmInput.addEventListener('input', function() {
            if (this.value === 'DELETE MY ACCOUNT') {
                deleteBtn.disabled = false;
                deleteBtn.style.opacity = '1';
            } else {
                deleteBtn.disabled = true;
                deleteBtn.style.opacity = '0.6';
            }
        });

        // Show loading state on form submission
        form.addEventListener('submit', function(e) {
            // Show loading indicator
            loading.style.display = 'flex';
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
            
            // Optional: Add a small delay to show the loading state
            // You can remove this if you want immediate submission
            setTimeout(() => {
                // Form will submit naturally after this
            }, 500);
        });

        // Auto-focus the confirmation input
        confirmInput.focus();

        // Add input validation styling
        confirmInput.addEventListener('focus', function() {
            this.style.borderColor = '#667eea';
        });

        confirmInput.addEventListener('blur', function() {
            if (this.value === 'DELETE MY ACCOUNT') {
                this.style.borderColor = '#48bb78';
            } else {
                this.style.borderColor = '#e0e6ed';
            }
        });
    }

    // Handle other interactive elements if they exist
    const cancelBtns = document.querySelectorAll('.btn-secondary');
    cancelBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Add confirmation for cancel action
            if (this.textContent.includes('Cancel')) {
                const confirmed = confirm('Are you sure you want to cancel? Your deletion request will remain active.');
                if (!confirmed) {
                    e.preventDefault();
                }
            }
        });
    });

    // Add hover effects for buttons
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            if (!this.disabled) {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }
        });

        btn.addEventListener('mouseleave', function() {
            if (!this.disabled) {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = 'none';
            }
        });
    });

    // Handle password field if it exists
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            // Add visual feedback for password field
            if (this.value.length > 0) {
                this.style.borderColor = '#667eea';
            } else {
                this.style.borderColor = '#e0e6ed';
            }
        });
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Escape key to cancel
        if (e.key === 'Escape') {
            const cancelBtn = document.querySelector('.btn-secondary');
            if (cancelBtn) {
                cancelBtn.click();
            }
        }
        
        // Enter key to submit if confirmation text is correct
        if (e.key === 'Enter' && confirmInput && confirmInput.value === 'DELETE MY ACCOUNT') {
            if (deleteBtn && !deleteBtn.disabled) {
                deleteBtn.click();
            }
        }
    });
});