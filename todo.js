class TodoManager {
    constructor() {
        this.lists = this.loadLists();
        this.initializeUI();
        this.attachEventListeners();
        this.render();
    }

    loadLists() {
        return JSON.parse(localStorage.getItem('novaTodoLists')) || [];
    }

    saveLists() {
        localStorage.setItem('novaTodoLists', JSON.stringify(this.lists));
    }

    initializeUI() {
        this.listsContainer = document.getElementById('lists-container');
        this.modal = document.getElementById('list-modal');
        this.listForm = document.getElementById('list-form');
        this.themeToggle = document.getElementById('theme-toggle');
    }

    attachEventListeners() {
        document.getElementById('add-list').addEventListener('click', () => this.showModal());
        this.listForm.addEventListener('submit', (e) => this.handleListSubmit(e));
        this.modal.querySelector('.close-btn').addEventListener('click', () => this.hideModal());
        this.modal.querySelector('.cancel-btn').addEventListener('click', () => this.hideModal());
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = this.themeToggle.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.replace('fa-moon', 'fa-sun');
            } else {
                icon.classList.replace('fa-sun', 'fa-moon');
            }
        });
    }

    showModal() {
        this.modal.style.display = 'block';
    }

    hideModal() {
        this.modal.style.display = 'none';
        this.listForm.reset();
    }

    handleListSubmit(e) {
        e.preventDefault();
        const title = document.getElementById('list-title').value;
        const color = document.getElementById('list-color').value;
        
        const newList = {
            id: Date.now(),
            title,
            color,
            items: []
        };

        this.lists.push(newList);
        this.saveLists();
        this.render();
        this.hideModal();
    }

    createTodoItem(listId, text) {
        const list = this.lists.find(l => l.id === listId);
        if (list) {
            list.items.push({
                id: Date.now(),
                text,
                completed: false,
                created: new Date()
            });
            this.saveLists();
            this.render();
        }
    }

    toggleTodoComplete(listId, itemId) {
        const list = this.lists.find(l => l.id === listId);
        if (list) {
            const item = list.items.find(i => i.id === itemId);
            if (item) {
                item.completed = !item.completed;
                this.saveLists();
                this.render();
            }
        }
    }

    deleteList(listId) {
        if (confirm('Are you sure you want to delete this list?')) {
            this.lists = this.lists.filter(l => l.id !== listId);
            this.saveLists();
            this.render();
        }
    }

    deleteTodoItem(listId, itemId) {
        const list = this.lists.find(l => l.id === listId);
        if (list) {
            list.items = list.items.filter(i => i.id !== itemId);
            this.saveLists();
            this.render();
        }
    }

    render() {
        this.listsContainer.innerHTML = this.lists.map(list => `
            <div class="todo-list" style="border-top: 4px solid ${list.color}">
                <div class="list-header">
                    <h3 class="list-title">${list.title}</h3>
                    <div class="list-actions">
                        <button onclick="todoManager.deleteList(${list.id})">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <ul class="todo-items">
                    ${list.items.map(item => `
                        <li class="todo-item ${item.completed ? 'completed' : ''}"
                            onclick="todoManager.toggleTodoComplete(${list.id}, ${item.id})">
                            <div class="todo-checkbox"></div>
                            <span class="todo-text">${item.text}</span>
                            <button onclick="event.stopPropagation(); todoManager.deleteTodoItem(${list.id}, ${item.id})">
                                <i class="fa-solid fa-times"></i>
                            </button>
                        </li>
                    `).join('')}
                </ul>
                <div class="add-todo">
                    <input type="text" placeholder="Add new task"
                           onkeypress="if(event.key === 'Enter') { 
                               event.preventDefault();
                               if(this.value.trim()) {
                                   todoManager.createTodoItem(${list.id}, this.value.trim());
                                   this.value = '';
                               }
                           }">
                    <button onclick="
                        const input = this.previousElementSibling;
                        if(input.value.trim()) {
                            todoManager.createTodoItem(${list.id}, input.value.trim());
                            input.value = '';
                        }">
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Initialize the Todo Manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.todoManager = new TodoManager();
});
