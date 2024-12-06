let posts = [];
let users = [];
let currentPostIndex = 0;
let loggedInUser = null;
const BASE_URL = 'http://localhost:3000';



let users1 = JSON.parse(localStorage.getItem("users1")) || [
    { name: "Admin", email: "admin@gmail.com", password: "Admin123", role: "admin" }
];



document.addEventListener("DOMContentLoaded", async () => {
    try {
        const savedUser = localStorage.getItem("loggedInUser");
        let userChoice = true;

        if (savedUser) {
            userChoice = confirm(`Do you want to stay logged in as ${JSON.parse(savedUser)}?`);

            if (userChoice) {
                loggedInUser = JSON.parse(savedUser);
                console.log("User chose to stay logged in:", loggedInUser);
            } else {
                loggedInUser = null;
                localStorage.removeItem("loggedInUser");
                console.log("User chose to log out. Defaulting to 'User'.");
            }
        } else {
            loggedInUser = null;
            localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
            console.log("No logged-in user found. Defaulting to 'User'.");
        }

        posts = (await syncFromServer('posts')) || [];
        users = (await syncFromServer('users')) || [];

        console.log("Posts loaded:", posts);
        console.log("Users loaded:", users);

        await setupRouter();
        updateUserUI();
    } catch (error) {
        console.error("Error during initialization:", error);
    }
});




async function addOrUpdateData(dataType, newData) {
    const existingData = JSON.parse(localStorage.getItem(dataType)) || [];

    const updatedData = [...existingData, newData];
    localStorage.setItem(dataType, JSON.stringify(updatedData));

    await syncToServer(dataType, [newData]);
    updateUserUI();

}
async function handleCredentialResponse(response) {
    try {
        const data = jwt_decode(response.credential);
        console.log("Decoded JWT data:", data);

        loggedInUser = data.name;

        console.log("Logged in as:", loggedInUser);

        const loggedInUserSpan = document.getElementById("loggedInUser");
        if (loggedInUserSpan) {
            loggedInUserSpan.innerText = `Logged in as: ${loggedInUser}`;
        }

        localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));
        await syncToServer();
        updateUserUI();

    } catch (error) {
        console.error("Error handling credential response:", error);
    }
}

function prefillAuthor() {
    const authorField = document.getElementById("author");
    if (loggedInUser && authorField) {
        authorField.value = loggedInUser.name;
    }
    updateUserUI();

}



async function syncToServer(dataType, dataArray) {
    try {
        const response = await fetch(`${BASE_URL}/${dataType}`);
        const existingData = await response.json();

        for (const item of dataArray) {
            const existingItem = existingData.find(existing => {
                if (dataType === 'posts') {
                    return (
                        existing.title === item.title &&
                        existing.content === item.content &&
                        existing.image === item.image &&
                        existing.date === item.date &&
                        existing.author === item.author
                    );
                } else if (dataType === 'users') {
                    return (
                        existing.name === item.name &&
                        existing.email === item.email &&
                        existing.password === item.password
                    );
                }
                return false;
            });

            if (existingItem) {
                const isNewer = new Date(item.date) > new Date(existingItem.date);

                if (isNewer) {
                    await fetch(`${BASE_URL}/${dataType}/${existingItem.id}`, {
                        method: 'DELETE',
                    });
                    console.log(`Deleted older ${dataType.slice(0, -1)} from server:`, existingItem);

                    await fetch(`${BASE_URL}/${dataType}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(item),
                    });
                    console.log(`Added newer ${dataType.slice(0, -1)} to server:`, item);
                } else {
                    console.log(`Existing ${dataType.slice(0, -1)} is up-to-date:`, existingItem);
                }
            } else {
                await fetch(`${BASE_URL}/${dataType}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(item),
                });
                console.log(`Added new ${dataType.slice(0, -1)} to server:`, item);
            }
        }
    } catch (error) {
        console.error(`Error syncing ${dataType}:`, error);
    }
}



async function syncFromServer(dataType) {
    try {
        const response = await fetch(`${BASE_URL}/${dataType}`);
        const data = await response.json();

        console.log(`${dataType} synced from server:`, data);

        localStorage.setItem(dataType, JSON.stringify(data));
        return data;
    } catch (error) {
        console.error(`Error fetching ${dataType}:`, error.message);

        const cachedData = localStorage.getItem(dataType);
        if (cachedData) {
            console.warn(`Using cached ${dataType} data`);
            return JSON.parse(cachedData);
        }

        console.warn(`No cached data available for ${dataType}.`);
        return [];
    }
}



async function setupRouter() {
    window.addEventListener('hashchange', handleRouteChange);
    await handleRouteChange(); 
}

async function handleRouteChange() {
    const hash = window.location.hash || '#home';
    switch (hash) {
        case '#home':
            loadHomePage();
            break;
        case '#posts':
            loadPosts();
            break;
        case '#addPost':
            await showPostForm();
            break;
        case '#login':
            showLoginForm();
            break;
        case '#register':
            await showRegisterForm();
            break;
        case '#logout':
            await logout();
            break;
        default:
            console.warn('Unknown route:', hash);
            loadHomePage();
            updateUserUI();
    }
}

async function saveToLocalStorage() {
    try {
        localStorage.setItem('posts', JSON.stringify(posts));
        localStorage.setItem('users', JSON.stringify(users));

        await syncToServer('posts', posts);
        await syncToServer('users', users);

        console.log("Data successfully saved to localStorage and synchronized with the server.");
    } catch (error) {
        console.error("Failed to synchronize data with the server. Data is saved in localStorage.", error);
    }
    updateUserUI();

}

function loadHomePage() {
    const app = document.getElementById("app");
    updateUserUI();

    app.innerHTML = `
    <header class="h11">
        <h2>Welcome to the Advanced Blog!</h2>
        <p>Choose an option to get started:</p>
        <div class="button-group">
          <button onclick="window.location.hash = '#addPost'">Add Post</button>
          <button onclick="window.location.hash = '#posts'">Posts</button>
          <button onclick="window.location.hash = '#register'">Register</button>
               ${loggedInUser ? `
            <button onclick="window.location.hash = '#logout'">Logout</button>
            ` : `
            <button onclick="window.location.hash = '#login'">Login</button>
            `}

        </div>
        </header>
       
    `;

    updateUserUI();
}

function loadInitialPage() {
    const app = document.getElementById("app");
    updateUserUI();

    app.innerHTML = `
    <header class="h11">
        <h2>Welcome to the Advanced Blog!</h2>
        <p>Choose an option to get started:</p>
        <div class="button-group">
          <button onclick="window.location.hash = '#addPost'">Add Post</button>
          <button onclick="window.location.hash = '#posts'">Posts</button>
          <button onclick="window.location.hash = '#register'">Register</button>
           ${loggedInUser ? `
            <button onclick="window.location.hash = '#logout'">Logout</button>
            ` : `
            <button onclick="window.location.hash = '#login'">Login</button>
        `}

        </div>
        </header>
       
    `;

    updateUserUI();

}


function showNextPost() {
    if (currentPostIndex < posts.length - 1) {
        currentPostIndex++;
        showPost(currentPostIndex);
    }
    updateUserUI();

}

function showPreviousPost() {
    if (currentPostIndex > 0) {
        currentPostIndex--;
        showPost(currentPostIndex);
    }
    updateUserUI();

}



function handleImageUpload(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        const previewImage = document.getElementById("previewImage");
        previewImage.src = e.target.result;
        previewImage.style.display = "block";
    };

    if (file) {
        reader.readAsDataURL(file);
    }
    updateUserUI();
}

async function addPost(event) {
    event.preventDefault();
    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const image = document.getElementById("previewImage").src || null;

    posts.push({
        title,
        content,
        image,
        date: formatDate(new Date()),
        author: loggedInUser || "User",
        comments: []
    });
    await saveToLocalStorage();
    currentPostIndex = posts.length - 1;
    showPost(currentPostIndex);
    updateUserUI();

}


async function updatePost(event) {
    event.preventDefault();
    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const image = document.getElementById("previewImage").src || null;

    posts[currentPostIndex] = {...posts[currentPostIndex], title, content, image};
    await saveToLocalStorage();
    showPost(currentPostIndex);
    updateUserUI();

}


function loadPosts() {
    currentPostIndex = posts.length - 1;
    const app = document.getElementById("app");
    if (posts.length === 0) {
        app.innerHTML = `
        <header>
            <h1>Advanced Blog with Comments</h1>
            <nav>
                <button onclick="window.location.hash = '#home'">Home</button>
                <button onclick="window.location.hash = '#addPost'">Add Post</button>
                <button onclick="window.location.hash = '#posts'">Posts</button>
                <button onclick="window.location.hash = '#register'">Register</button>
                ${loggedInUser ? `
                    <button onclick="window.location.hash = '#logout'">Logout</button>
                ` : `
                    <button onclick="window.location.hash = '#login'">Login</button>
                `}
                <span id="loggedInUser" class="hidden"></span>

            </nav>
        </header>
        <p>No posts available. Add a new one!</p>
        <button onclick="window.location.hash = '#addPost'">Add Post</button>
    `;

    } else {
        app.innerHTML = `
          <header>
            <h1>Advanced Blog with Comments</h1>
            <nav>
                <button onclick="window.location.hash = '#home'">Home</button>
                <button onclick="window.location.hash = '#addPost'">Add Post</button>
                <button onclick="window.location.hash = '#posts'">Posts</button>
                <button onclick="window.location.hash = '#register'">Register</button>
                ${loggedInUser ? `
                    <button onclick="window.location.hash = '#logout'">Logout</button>
                ` : `
                    <button onclick="window.location.hash = '#login'">Login</button>
                `}
                <span id="loggedInUser" class="hidden"></span>
            </nav>
        </header>
    `;
        showPost(currentPostIndex);
    }


    document.addEventListener("DOMContentLoaded", () => {
        loadInitialPage();
        updateUserUI();
    });
    updateUserUI();
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showPost(index) {
    const app = document.getElementById("app");
    const post = posts[index];

    const commentsToShow = post.comments.slice(
        currentCommentPage * ITEMS_PER_PAGE,
        (currentCommentPage + 1) * ITEMS_PER_PAGE
    );

    app.innerHTML = `
        <header>
            <h1>Advanced Blog with Comments</h1>
             <nav>
                <button onclick="window.location.hash = '#home'">Home</button>
                <button onclick="window.location.hash = '#addPost'">Add Post</button>
                <button onclick="window.location.hash = '#posts'">Posts</button>
                <button onclick="window.location.hash = '#register'">Register</button>
                ${loggedInUser ? `
                    <button onclick="window.location.hash = '#logout'">Logout</button>
                ` : `
                    <button onclick="window.location.hash = '#login'">Login</button>
                `}
                <span id="loggedInUser" class="hidden"></span>
            </nav>
        </header>
        <article>
            <h1>Autor: ${post.author}</h1>
            <h2>Title: ${post.title}</h2>
            ${post.image ? `<img src="${post.image}" alt="${post.title}">` : ""}
            <p>Description: ${post.content}</p>
            <p><small>Posted on: ${post.date}</small></p>
          <h3>Comments</h3>
<div id="comments">
    ${post.comments.length === 0 ? `
        <p>No comments yet. Be the first to write one!</p>
    ` : `
        ${commentsToShow.map((comment, commentIndex) => `
            <div class="comment">
                <strong>${comment.author}:</strong> ${comment.text}
                <p><small>Commented on: ${comment.date}</small></p>
                ${loggedInUser === comment.author || isAdmin() ? `
                    <button onclick="deleteComment(${index}, ${commentIndex})">Delete Comment</button>
                ` : ""}
            </div>
        `).join("")}
    `}
</div>
            ${renderCommentPagination(post.comments.length)}
            <form onsubmit="addComment(event)"> 
                <label for="commentAuthor">Your Name</label>
                <input type="text" id="commentAuthor" value="${loggedInUser || 'User'}" ${loggedInUser ? "readonly" : ""} required>
                <label for="commentText">Comment</label>
                <textarea id="commentText" required></textarea>
                <button type="submit">Add Comment</button>
            </form>
        </article>
        <div class="post-controls">
                    ${loggedInUser === post.author || isAdmin() ? `
            <button class="edit" onclick="showPostForm(true, ${index})">Edit</button>
              ` : ""}
            ${loggedInUser === post.author || isAdmin() ? `
                <button class="delete" onclick="deletePost(${index})">Delete Post</button>
            ` : ""}
        </div>
        <footer>
            <p>Page ${index + 1} of ${posts.length}</p> <!-- Поточна сторінка -->
            <button ${index === 0 ? "disabled" : ""} onclick="showPreviousPost(); scrollToTop();">Previous</button>
            <button ${index === posts.length - 1 ? "disabled" : ""} onclick="showNextPost(); scrollToTop();">Next</button>
            <button onclick="window.location.hash = '#addPost';  scrollToTop();">Add Post</button>
            <button onclick="window.location.hash = '#home';scrollToTop();">Home</button>
        </footer>
    `;
    updateUserUI();
}




async function showPostForm(isEdit = false, postIndex = null) {
    const app = document.getElementById("app");

    if (!app) {
        console.error("Cannot find element with ID 'app'.");
        return;
    }
    if (!loggedInUser) {
        alert("You must be logged in to add or edit posts.");
        return;
    }

    const post = isEdit && postIndex !== null ? posts[postIndex] : {title: '', content: '', image: ''};

    app.innerHTML = `
        <header>
            <h1>Advanced Blog with Comments</h1>
            <nav>
                <button onclick="window.location.hash = '#home'">Home</button>
                <button onclick="window.location.hash = '#addPost'">Add Post</button>
                <button onclick="window.location.hash = '#posts'">Posts</button>
                <button onclick="window.location.hash = '#register'">Register</button>
                ${loggedInUser ? `
                    <button onclick="window.location.hash = '#logout'">Logout</button>
                ` : `
                    <button onclick="window.location.hash = '#login'">Login</button>
                `}
                <span id="loggedInUser" class="hidden"></span>
            </nav>
        </header>

        <form id="postForm">
            <label for="title">Title</label>
            <input type="text" id="title" required>

            <label for="content">Content</label>
            <textarea id="content" required></textarea>

            <label for="image">Image</label>
            <input type="file" id="imageInput" accept="image/*">
            <img id="previewImage" style="display: none;" alt="">
            <button type="submit">${isEdit ? 'Update Post' : 'Add Post'}</button>
        </form>
        <button class="cancel" onclick="loadPosts()">Cancel</button>
    `;

    document.getElementById("title").value = post.title;
    document.getElementById("content").value = post.content;

    if (post.image) {
        const previewImage = document.getElementById("previewImage");
        previewImage.src = post.image;
        previewImage.style.display = "block";
    }

    const postForm = document.getElementById("postForm");
    postForm.addEventListener("submit", (event) => {
        event.preventDefault();

        if (isEdit) {
            updatePost(event);
        } else {
            addPost(event);
        }
    });

    document.getElementById("imageInput").addEventListener("change", handleImageUpload);

    updateUserUI();
}


function formatDate(date) {
    return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}


const ITEMS_PER_PAGE = 10;
let currentCommentPage = 0;


async function addComment(event) {
    event.preventDefault();

    if (!loggedInUser) {
        alert("You must be logged in to add comments.");
        return;
    }

    const author = loggedInUser || "User";
    const text = document.getElementById("commentText").value;

    posts[currentPostIndex].comments.push({
        author,
        text,
        date: formatDate(new Date())
    });

    await saveToLocalStorage();

    showPost(currentPostIndex);
    updateUserUI();

}

function showNextComments() {
    const post = posts[currentPostIndex];
    const totalPages = Math.ceil(post.comments.length / ITEMS_PER_PAGE);
    if (currentCommentPage < totalPages - 1) {
        currentCommentPage++;
        showPost(currentPostIndex);
    }
    updateUserUI();

}

function showPreviousComments() {
    if (currentCommentPage > 0) {
        currentCommentPage--;
        showPost(currentPostIndex);
    }
    updateUserUI();
}


function renderCommentPagination(totalComments) {
    const totalPages = Math.ceil(totalComments / ITEMS_PER_PAGE);
    if (totalPages <= 1) return "";

    return `
        <div class="pagination">
        <footer> 
            <button ${currentCommentPage === 0 ? "disabled" : ""} onclick="showPreviousComments()">Previous Comments</button>
            <span>Page ${currentCommentPage + 1} of ${totalPages}</span>
            <button ${currentCommentPage === totalPages - 1 ? "disabled" : ""} onclick="showNextComments()">Next Comments</button>
            </footer>
        </div>
    `;
}

function showLoginForm() {

    if (loggedInUser) {
        alert("You are already logged in.");
        loadPosts();
        return;
    }
    const app = document.getElementById("app");
    app.innerHTML = `
        <header>
            <h1>Advanced Blog with Comments</h1>
            <nav>
                <button onclick="window.location.hash = '#home'">Home</button>
                <button onclick="window.location.hash = '#addPost'">Add Post</button>
                <button onclick="window.location.hash = '#posts'">Posts</button>
                <button onclick="window.location.hash = '#register'">Register</button>
                ${loggedInUser ? `
                    <button onclick="window.location.hash = '#logout'">Logout</button>
                ` : `
                    <button onclick="window.location.hash = '#login'">Login</button>
                `}
                <span id="loggedInUser" class="hidden"></span>
            </nav>
        </header>
       
        <form onsubmit="login(event)">
            <h2>Login</h2>
            <label for="loginEmail">Email</label>
            <input type="email" id="loginEmail" required>
            <label for="loginPassword">Password</label>
            <div>
                <input type="password" id="loginPassword" required>
                <button type="button" id="togglePassword" style="
                    right: 55%;
                    transform: translateY(-5%);
                    background: none;
                    border: none;
                    cursor: pointer;">
                    👁️
                </button>
            </div>
            <button type="submit">Login</button>
        </form>
        <button class="cancel" onclick="loadPosts()">Cancel</button>
    `;

    const togglePasswordButton1 = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("loginPassword");

    togglePasswordButton1.addEventListener("click", () => {
        const isPasswordVisible = passwordInput.type === "text";
        passwordInput.type = isPasswordVisible ? "password" : "text";
        togglePasswordButton1.textContent = isPasswordVisible ? "👁️" : "🙈";
    });

    updateUserUI();
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const user = users.find(user => user.email === email && user.password === password) ||
        users1.find(user => user.email === email && user.password === password);


    if (!user) {
        alert("Invalid email or password!");
        return;
    }
    loggedInUser = user.name;

    localStorage.setItem("loggedInUser", JSON.stringify(loggedInUser));


    await saveToLocalStorage();
    loadPosts();
    updateUserUI();
}

function updateUserUI() {
    const loginButton = document.getElementById("loginButton");
    const logoutButton = document.getElementById("logoutButton");
    const loggedInUserSpan = document.getElementById("loggedInUser");

    if (loggedInUser) {
        loginButton?.classList.add("hidden");
        logoutButton?.classList.remove("hidden");
        loggedInUserSpan?.classList.remove("hidden");
        loggedInUserSpan.innerText = `${loggedInUser}`;

        if (isAdmin(loggedInUser)) {
            let adminButton = document.getElementById("adminPanelButton");
            if (!adminButton) {
                adminButton = document.createElement("button");
                adminButton.id = "adminPanelButton";
                adminButton.innerText = "Admin Panel";

                adminButton.addEventListener("click", async () => {
                    try {
                        await showUserList();
                    } catch (error) {
                        console.error("Failed to show user list:", error);
                    }                });

                document.querySelector(".header").appendChild(adminButton);
            }
        }
    } else {
        loginButton?.classList.remove("hidden");
        logoutButton?.classList.add("hidden");
        loggedInUserSpan?.classList.add("hidden");
        loggedInUserSpan.innerText = "User";

        const adminButton = document.getElementById("adminPanelButton");
        if (adminButton) {
            adminButton.remove();
        }
    }

}



async function logout() {
    loggedInUser = null;
    await saveToLocalStorage();
    loadPosts();
    updateUserUI();
}

async function showRegisterForm() {
    if (loggedInUser) {
        alert("You are already logged in. Registration is not allowed.");
        loadPosts();
        return;
    }

    const app = document.getElementById("app");
    app.innerHTML = `
        <header>
            <h1>Advanced Blog with Comments</h1>
         <nav>
                <button onclick="window.location.hash = '#home'">Home</button>
                <button onclick="window.location.hash = '#addPost'">Add Post</button>
                <button onclick="window.location.hash = '#posts'">Posts</button>
                <button onclick="window.location.hash = '#register'">Register</button>
                ${loggedInUser ? `
                    <button onclick="window.location.hash = '#logout'">Logout</button>
                ` : `
                    <button onclick="window.location.hash = '#login'">Login</button>
                `}
                <span id="loggedInUser" class="hidden"></span>
            </nav>
        </header>

        <form onsubmit="register(event)">
            <h2>Register</h2>
            <label for="registerName">Name</label>
            <input type="text" id="registerName" required>

            <label for="registerEmail">Email</label>
            <input type="email" id="registerEmail" required>

            <label for="registerPassword">Password</label>
            <div>
                <input type="password" id="registerPassword" required minlength="8" placeholder="At least 8 characters">
                <button type="button" id="togglePassword" style="
                right: 69%;
                transform: translateY(-5%);
                background: none;
                border: none;
                cursor: pointer;">👁️</button>
            </div>
            <small>Password must be at least 8 characters long.</small>

            <button type="submit">Register</button>
        </form>
        <button class="cancel" onclick="loadPosts()">Cancel</button>
    `;

    const togglePasswordButton = document.getElementById("togglePassword");
    const passwordInput = document.getElementById("registerPassword");

    togglePasswordButton.addEventListener("click", () => {
        const isPasswordVisible = passwordInput.type === "text";
        passwordInput.type = isPasswordVisible ? "password" : "text";
        togglePasswordButton.textContent = isPasswordVisible ? "👁️" : "🙈";
    });
    await saveToLocalStorage();
    updateUserUI();
}


async function register(event) {
    event.preventDefault();
    const name = document.getElementById("registerName").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;

    if (password.length < 8) {
        alert("Password must be at least 8 characters long.");
        return;
    }

    if (!isPasswordStrong(password)) {
        alert("Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.");
        return;
    }

    if (users.some(user => user.email === email)) {
        alert("User with this email already exists!");
        return;
    }

    const newUser = {name, email, password};
    users.push(newUser);
    await saveToLocalStorage();
    alert("Registration successful! Please login.");
    showLoginForm();
    updateUserUI();
}


function isAdmin() {
    const user = users1.find(user => user.name === loggedInUser && user.role === "admin");
    return Boolean(user);
}


async function deleteComment(postIndex, commentIndex) {
    const post = posts[postIndex];
    const comment = post.comments[commentIndex];

    if (loggedInUser !== comment.author && !isAdmin()) {
        alert("You can only delete your own comments.");
        return;
    }

    if (isAdmin() || confirm("Are you sure you want to delete this comment?")) {
        post.comments.splice(commentIndex, 1);
        await saveToLocalStorage();
        showPost(postIndex);
    }
}

async function deletePost(index) {
    const post = posts[index];

    if (loggedInUser !== post.author && !isAdmin()) {
        alert("You can only delete your own posts.");
        return;
    }

    if (isAdmin() || confirm("Are you sure you want to delete this post?")) {
        posts.splice(index, 1);
        await saveToLocalStorage();
        currentPostIndex = Math.max(0, index - 1);
        if (posts.length === 0) {
            loadPosts();
        } else {
            showPost(currentPostIndex);
        }
    }

    updateUserUI();
}


function isPasswordStrong(password) {
    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
}








async function showUserList() {
    if (!isAdmin()) {
        alert("Access denied. Only admins can view this page.");
        return;
    }

    const app = document.getElementById("app");
    app.innerHTML = `
            <h1>Admin Panel</h1>
            <header>
            <nav>
                <button onclick="window.location.hash = '#home'">Home</button>
                <button onclick="window.location.hash = '#addPost'">Add Post</button>
                <button onclick="window.location.hash = '#posts'">Posts</button>
                <button onclick="window.location.hash = '#register'">Register</button>
                ${loggedInUser ? `
                    <button onclick="window.location.hash = '#logout'">Logout</button>
                ` : `
                    <button onclick="window.location.hash = '#login'">Login</button>
                `}
                <span id="loggedInUser" class="hidden"></span>
            </nav>
        </header>
        <section class="admin-panel">
            <h2>All Users</h2>
            <ul id="userList">
                ${users.map(user => `
                    <li>
                        Name: ${user.name}, Email: ${user.email}
                        <button onclick="deleteUser('${user.id}')">Delete</button>
                    </li>
                `).join('')}
            </ul>
            <h2>All Posts</h2>
            <ul id="postList">
                ${posts.map(post => `
                    <li>
                        Title: ${post.title}
                        <button onclick="deletePost1('${post.id}')">Delete</button>
                    </li>
                `).join('')}
            </ul>
        </section>
    `;
}


async function deleteUser(userId) {
    if (!isAdmin()) {
        alert("Access denied. Only admins can delete users.");
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete this user?");
    if (!confirmDelete) return;

    try {
        await fetch(`${BASE_URL}/users/${userId}`, {
            method: "DELETE",
        });

        users = users.filter(user => user.id !== userId);
        localStorage.setItem("users", JSON.stringify(users));

        alert("User deleted successfully.");
        await showUserList();
    } catch (error) {
        console.error("Failed to delete user:", error);
        alert("An error occurred while deleting the user.");
    }
}



async function deletePost1(postId) {
    if (!isAdmin()) {
        alert("Access denied. Only admins can delete posts.");
        return;
    }

    const confirmDelete = confirm("Are you sure you want to delete this post?");
    if (!confirmDelete) return;

    try {
        await fetch(`${BASE_URL}/posts/${postId}`, {
            method: "DELETE",
        });

        posts = posts.filter(post => post.id !== postId);
        localStorage.setItem("posts", JSON.stringify(posts));

        alert("Post deleted successfully.");
        await showUserList();
    } catch (error) {
        console.error("Failed to delete post:", error);
        alert("An error occurred while deleting the post.");
    }
}
