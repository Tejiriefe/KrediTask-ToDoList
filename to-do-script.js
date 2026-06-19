/* ================================================================
   script.js — TaskFlow To-Do App
   
   This file contains ALL the logic for the app. Read it top to
   bottom the first time — each section builds on the last.
================================================================ */


/* ================================================================
   SECTION 1 — STATE
   
   "State" just means "the data our app needs to remember while
   the page is open."
   
   tasks   — our master array. Every task is an object in here.
   nextId  — a simple counter so each task gets a unique ID number.
   editId  — stores the ID of the task being edited, or null when
             we are not editing anything.
================================================================ */

let tasks  = [];   // will be filled from localStorage on page load
let nextId = 1;    // starts at 1, increases by 1 for each new task
let editId = null; // null = "not editing anything right now"


/* ================================================================
   SECTION 2 — DOM REFERENCES
   
   We grab the elements we'll interact with and store them in
   variables. This is faster than calling querySelector() every
   time we need them.
================================================================ */

// Form inputs
const nameInput = document.querySelector('#todo-name');
const dateInput = document.querySelector('#todo-date');
const timeInput = document.querySelector('#todo-time');

// Buttons
const submitBtn = document.querySelector('#submit-btn');
const cancelBtn = document.querySelector('#cancel-btn');

// Dynamic parts of the table section
const taskTableBody = document.querySelector('#task-table-body');
const tableWrapper  = document.querySelector('#table-wrapper');
const emptyState    = document.querySelector('#empty-state');
const taskCount     = document.querySelector('#task-count');

// The form card's heading (changes between "Add a Task" / "Edit Task")
const formTitle = document.querySelector('#form-title');

// Modal elements
const modalOverlay = document.querySelector('#modal-overlay');
const modalBody    = document.querySelector('#modal-body');


/* ================================================================
   SECTION 3 — LOCALSTORAGE HELPERS
   
   Two tiny helper functions that handle saving and loading.
   We keep them here so we don't repeat the same code all over.
================================================================ */

/**
 * saveToLocalStorage()
 * Converts our tasks array and nextId counter into JSON strings
 * and saves them inside the browser's localStorage.
 *
 * Think of localStorage like a notepad the browser keeps for
 * each website — it survives page refreshes.
 */
function saveToLocalStorage() {
  localStorage.setItem('taskflow_tasks',  JSON.stringify(tasks));
  localStorage.setItem('taskflow_nextId', JSON.stringify(nextId));
}

/**
 * loadFromLocalStorage()
 * Runs ONCE when the page loads. It checks whether we previously
 * saved anything. If we did, it reads those JSON strings back and
 * converts them into real JavaScript values.
 */
function loadFromLocalStorage() {
  // localStorage.getItem() returns null if the key doesn't exist yet
  const savedTasks  = localStorage.getItem('taskflow_tasks');
  const savedNextId = localStorage.getItem('taskflow_nextId');

  if (savedTasks) {
    // JSON.parse() turns the string back into a JavaScript array
    tasks = JSON.parse(savedTasks);
  }

  if (savedNextId) {
    // JSON.parse() turns the string back into a number
    nextId = JSON.parse(savedNextId);
  }
}


/* ================================================================
   SECTION 4 — RENDERING THE TABLE
   
   renderTable() is the core "display" function. Any time our data
   changes (add / edit / delete), we call this to rebuild the table
   HTML from scratch based on the current tasks array.
================================================================ */

/**
 * renderTable()
 * Rebuilds the <tbody> content to match the tasks array.
 * Also shows/hides the empty-state message and updates the badge.
 */
function renderTable() {

  // ----- 4a. Update the task count badge -----
  const count = tasks.length;
  taskCount.innerHTML = count + (count === 1 ? ' task' : ' tasks');

  // ----- 4b. Toggle empty-state vs table -----
  if (count === 0) {
    emptyState.style.display   = 'block';
    tableWrapper.style.display = 'none';
    taskTableBody.innerHTML    = ''; // clear any old rows
    return; // nothing left to do
  }

  // There are tasks, so show the table and hide the empty message
  emptyState.style.display   = 'none';
  tableWrapper.style.display = 'block';

  // ----- 4c. Build a row of HTML for every task -----
  // We use .map() to turn each task object into an HTML string,
  // then .join('') to merge all those strings into one big string.
  taskTableBody.innerHTML = tasks.map(function(task, index) {

    // We pass the task's ID to each button function so the button
    // knows which task it belongs to.
    return `
      <tr>
        <td class="id-cell">#${task.id}</td>
        <td>${task.name}</td>
        <td>${formatDate(task.date)}</td>
        <td>${formatTime(task.time)}</td>
        <td class="action-cell">
          <button class="btn-view"   onclick="viewTask(${task.id})">View</button>
          <button class="btn-edit"   onclick="editTask(${task.id})">Edit</button>
          <button class="btn-delete" onclick="deleteTask(${task.id})">Delete</button>
        </td>
      </tr>
    `;

  }).join('');
}


/* ================================================================
   SECTION 5 — FORM HANDLING
   
   handleSubmit() is called by the "Add Task" / "Update" button.
   It decides whether we are creating a new task or saving an edit.
================================================================ */

/**
 * handleSubmit()
 * Reads the form values, validates them, then either adds a new
 * task to the array or updates the existing one being edited.
 */
function handleSubmit() {

  // ----- 5a. Read form values (trim removes accidental spaces) -----
  const name = nameInput.value.trim();
  const date = dateInput.value;
  const time = timeInput.value;

  // ----- 5b. Basic validation — all three fields are required -----
  if (!name || !date || !time) {
    alert('Please fill in all three fields before saving.');
    return; // stop the function early — don't save an empty task
  }

  // ----- 5c. Are we editing or adding? -----
  if (editId !== null) {
    // --- EDIT PATH ---
    // editId holds the ID of the task we loaded into the form.
    // We loop through tasks and find the one with a matching ID.
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].id === editId) {
        // Replace its properties with the new form values
        tasks[i].name = name;
        tasks[i].date = date;
        tasks[i].time = time;
        break; // found it — stop looping
      }
    }

    resetForm(); // clear form and exit edit mode

  } else {
    // --- ADD PATH ---
    // Build a new task object with a unique ID
    const newTask = {
      id:   nextId,
      name: name,
      date: date,
      time: time
    };

    tasks.push(newTask); // add it to the end of the array
    nextId++;            // increment so the next task gets a different ID
    resetForm();
  }

  // ----- 5d. Save and redisplay -----
  saveToLocalStorage();
  renderTable();
}


/* ================================================================
   SECTION 6 — VIEW TASK
   
   Shows a modal (pop-up) with the full details of one task.
================================================================ */

/**
 * viewTask(id)
 * Finds the task with the given id and displays it in the modal.
 * @param {number} id — the task's unique ID number
 */
function viewTask(id) {

  // Find the task object in the array that has this id
  const task = findTaskById(id);
  if (!task) return; // safety check — shouldn't happen, but just in case

  // Build the HTML for the modal's body using the task's data
  modalBody.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">ID</span>
      <span class="detail-value">#${task.id}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Task Name</span>
      <span class="detail-value">${task.name}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Date</span>
      <span class="detail-value">${formatDate(task.date)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Time</span>
      <span class="detail-value">${formatTime(task.time)}</span>
    </div>
  `;

  // Show the overlay
  modalOverlay.style.display = 'flex';
}

/**
 * closeModal()
 * Hides the modal overlay.
 */
function closeModal() {
  modalOverlay.style.display = 'none';
}

// Also close the modal if the user clicks the dark backdrop
// (not the white box itself).
modalOverlay.addEventListener('click', function(event) {
  // event.target is the element the user actually clicked.
  // We only close if they clicked the overlay, not the box inside.
  if (event.target === modalOverlay) {
    closeModal();
  }
});


/* ================================================================
   SECTION 7 — EDIT TASK
   
   Loads an existing task's data back into the form so the user
   can change values and click "Update".
================================================================ */

/**
 * editTask(id)
 * Fills the form with the chosen task's data and switches the
 * button label to "Update".
 * @param {number} id — the task's unique ID number
 */
function editTask(id) {

  const task = findTaskById(id);
  if (!task) return;

  // ----- 7a. Fill the form inputs with the task's current values -----
  nameInput.value = task.name;
  dateInput.value = task.date;
  timeInput.value = task.time;

  // ----- 7b. Remember WHICH task we're editing -----
  // handleSubmit() checks editId to know whether to update or add.
  editId = id;

  // ----- 7c. Update the UI to "Edit mode" -----
  formTitle.textContent      = 'Edit Task';
  submitBtn.textContent      = 'Update Task';
  cancelBtn.style.display    = 'inline-flex';

  // Scroll smoothly up to the form so the user sees it
  document.querySelector('.form-card').scrollIntoView({ behavior: 'smooth' });
}

/**
 * cancelEdit()
 * Exits edit mode without saving, resets the form to its
 * default "Add a Task" state.
 */
function cancelEdit() {
  resetForm();
}


/* ================================================================
   SECTION 8 — DELETE TASK
================================================================ */

/**
 * deleteTask(id)
 * Removes the task with the given id from the array, then saves
 * and re-renders.
 * @param {number} id — the task's unique ID number
 */
function deleteTask(id) {

  // Confirm before deleting — prevents accidental removal
  const confirmed = confirm('Delete this task? This cannot be undone.');
  if (!confirmed) return;

  // .filter() creates a NEW array containing only the tasks
  // whose id does NOT match. The deleted task is simply left out.
  tasks = tasks.filter(function(task) {
    return task.id !== id;
  });

  // If the task being deleted was also loaded into the edit form,
  // cancel that edit so we're not editing a ghost.
  if (editId === id) {
    resetForm();
  }

  saveToLocalStorage();
  renderTable();
}


/* ================================================================
   SECTION 9 — UTILITY FUNCTIONS
   
   Small helper functions used in multiple places.
================================================================ */

/**
 * findTaskById(id)
 * Returns the task object with the matching id, or undefined.
 * @param {number} id
 */
function findTaskById(id) {
  // .find() loops through the array and returns the first item
  // where the condition is true.
  return tasks.find(function(task) {
    return task.id === id;
  });
}

/**
 * resetForm()
 * Clears all form inputs and returns the form to its default
 * "add" state: correct heading, correct button label, Cancel hidden.
 */
function resetForm() {
  nameInput.value = '';
  dateInput.value = '';
  timeInput.value = '';

  editId = null; // no longer in edit mode

  formTitle.textContent   = 'Add a Task';
  submitBtn.textContent   = 'Add Task';
  cancelBtn.style.display = 'none';
}

/**
 * formatDate(dateString)
 * Converts the raw "YYYY-MM-DD" value from the date input into a
 * friendlier display like "Jun 16, 2026".
 * @param {string} dateString — e.g. "2026-06-16"
 * @returns {string}
 */
function formatDate(dateString) {
  if (!dateString) return '—';
  // We append 'T00:00:00' to avoid timezone-shift bugs in some browsers
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric'
  });
}

/**
 * formatTime(timeString)
 * Converts the raw "HH:MM" 24-hour value into 12-hour AM/PM format.
 * @param {string} timeString — e.g. "14:30"
 * @returns {string}
 */
function formatTime(timeString) {
  if (!timeString) return '—';
  const [hours, minutes] = timeString.split(':').map(Number);
  const ampm   = hours >= 12 ? 'PM' : 'AM';
  const h12    = hours % 12 || 12; // convert 0 to 12 for midnight
  const minStr = String(minutes).padStart(2, '0'); // ensure "05" not "5"
  return `${h12}:${minStr} ${ampm}`;
}


/* ================================================================
   SECTION 10 — KEYBOARD SHORTCUT
   
   Pressing Enter while the form is focused submits the form.
   This is a quality-of-life improvement: pressing Enter is
   faster than moving the mouse to click "Add Task".
================================================================ */

document.addEventListener('keydown', function(event) {
  // Only fire if the modal is not open and the user pressed Enter
  if (event.key === 'Enter' && modalOverlay.style.display === 'none') {
    // Only trigger if the user is actually inside a form field
    const active = document.activeElement;
    if (active === nameInput || active === dateInput || active === timeInput) {
      handleSubmit();
    }
  }
});


/* ================================================================
   SECTION 11 — INITIALISATION
   
   This code runs automatically as soon as the script is loaded.
   It loads saved data and draws the initial table.
================================================================ */

// Step 1: Load whatever was saved in a previous session
loadFromLocalStorage();

// Step 2: Draw the table (or empty state) with that data
renderTable();