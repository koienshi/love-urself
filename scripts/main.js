// Create needed constants
const list = document.querySelector('.entry-display');
const titleInput = document.querySelector('#title');
const bodyInput = document.querySelector('#body');
const form = document.querySelector('form');
const submitBtn = document.querySelector('form button');

// Create an instance of a db object for us to store the open database in
let db;

window.onload = function() {
    // Open our database; it is created if it doesn't already exist
    // (see onupgradeneeded below)
    let request = window.indexedDB.open('notes_db', 1);
    // creates 'request' to open version '1' of database called 'notes_db'
    // will be created if doesn't already exist
    
    // onerror handler signifies that the database didn't open successfully
    request.onerror = function() {
        console.log('Database failed to open');
    };
    
    // onsuccess handler signifies that the database opened successfully
    request.onsuccess = function() {
        console.log('Database opened successfully');
    
        // Store the opened database object in the db variable. This is used a lot below
        db = request.result;
    
        // Run the displayData() function to display the notes already in the IDB
        displayData();
    };

    // Setup the database tables if this has not already been done
    request.onupgradeneeded = function(e) {
        // Grab a reference to the opened database
        let db = e.target.result; // 'e.target' = 'request' = 'window.indexedDB.open('notes_db', 1)'
    
        // Create an objectStore to store our notes in (basically like a single table)
        // including a auto-incrementing key
        let objectStore = db.createObjectStore('notes_os', { keyPath: 'id', autoIncrement:true });
    
        // Define what data items the objectStore will contain
        objectStore.createIndex('title', 'title', { unique: false });
        objectStore.createIndex('body', 'body', { unique: false });
    
        console.log('Database setup complete');
    };

    // Create an onsubmit handler so that when the form is submitted the addData() function is run
    form.onsubmit = addData;

    // Define the addData() function
    function addData(e) {
        // prevent default - we don't want the form to submit in the conventional way
        e.preventDefault(); // 'e' = the event of whatever called addData() = '_____'.addData()
    
        // grab the values entered into the form fields and store them in an object ready for being inserted into the DB
        let newItem = { title: titleInput.value, body: bodyInput.value };
    
        // open a read/write db transaction, ready for adding the data
        let transaction = db.transaction(['notes_os'], 'readwrite');
    
        // call an object store that's already been added to the database
        let objectStore = transaction.objectStore('notes_os');
    
        // Make a request to add our newItem object to the object store
        let request = objectStore.add(newItem);
        request.onsuccess = function() {
            // Clear the form, ready for adding the next entry
            titleInput.value = '';
            bodyInput.value = '';
        };
    
        // Report on the success of the transaction completing, when everything is done
        transaction.oncomplete = function() {
            console.log('Transaction completed: database modification finished.');
        
            // update the display of data to show the newly added item, by running displayData() again.
            displayData();
        };
    
        transaction.onerror = function() {
            console.log('Transaction not opened due to error');
        };
    }

    // Define the displayData() function
    function displayData() {
        // Here we empty the contents of the list element each time the display is updated
        // If you didn't do this, you'd get duplicates listed each time a new note is added
        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }
    
        // Open our object store and then get a cursor - which iterates through all the
        // different data items in the store
        let objectStore = db.transaction('notes_os').objectStore('notes_os');
        objectStore.openCursor().onsuccess = function(e) {
            // Get a reference to the cursor
            let cursor = e.target.result; // 'e.target' = 'objectStore.openCursor()' = IDBCursor object
        
            // If there is still another data item to iterate through, keep running this code
            if(cursor) {
                // Create a list item, h2, and p to put each data item inside when displaying it
                // structure the HTML fragment, and append it inside the list
                const entry = document.createElement('div');
                entry.classList.add('entry');
                const h2 = document.createElement('h2');
                h2.classList.add('title');
                const para = document.createElement('p');

                // get current date
                var today = new Date();
                var dd = String(today.getDate()).padStart(2, '0');
                var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
                var yyyy = today.getFullYear();
                const h4 = document.createElement('h4');
                h4.textContent = "Date: " + mm + "/" + dd + "/" + yyyy;

                entry.appendChild(h2);
                entry.appendChild(h4);
                entry.appendChild(para);
                list.insertBefore(entry, list.firstElementChild); // most recent entries on top
        
                // Put the data from the cursor inside the h2 and para
                h2.textContent = cursor.value.title;
                para.textContent = cursor.value.body;
        
                // Store the ID of the data item inside an attribute on the entry, so we know
                // which item it corresponds to. This will be useful later when we want to delete items
                entry.setAttribute('data-note-id', cursor.value.id);
        
                // Create a button and place it inside each entry
                const deleteBtn = document.createElement('button');
                entry.appendChild(deleteBtn);
                deleteBtn.textContent = 'Delete';
        
                // Set an event handler so that when the button is clicked, the deleteItem()
                // function is run
                deleteBtn.onclick = deleteItem;
        
                // Iterate to the next item in the cursor
                cursor.continue();
            } else {
                // Again, if list item is empty, display a 'No notes stored' message
                if(!list.firstChild) {
                    const entry = document.createElement('p');
                    entry.textContent = 'No entries stored.';
                    list.appendChild(entry);
                }
                // if there are no more cursor items to iterate through, say so
                console.log('Notes all displayed');
            }
        };
    }

    // Define the deleteItem() function
    function deleteItem(e) {
        // retrieve the name of the task we want to delete. We need
        // to convert it to a number before trying it use it with IDB; IDB key
        // values are type-sensitive.
        let noteId = Number(e.target.parentNode.getAttribute('data-note-id')); // entry
        // e.target = whatever called deleteItem (deleteBtn)
    
        // open a database transaction and delete the task, finding it using the id we retrieved above
        let transaction = db.transaction(['notes_os'], 'readwrite');
        let objectStore = transaction.objectStore('notes_os');
        let request = objectStore.delete(noteId); // returns deleted entry (li); deletes entry(noteId) from object store
    
        // report that the data item has been deleted
        transaction.oncomplete = function() {
            // delete the parent of the button from the DOM
            // which is the list item, so it is no longer displayed
            e.target.parentNode.parentNode.removeChild(e.target.parentNode); // deleteBtn --> entry --> list.removeChild(button --> entry)
            console.log('Note ' + noteId + ' deleted.');
        
            // Again, if list item is empty, display a 'No notes stored' message
            if(!list.firstChild) {
                let entry = document.createElement('li');
                entry.textContent = 'No notes stored.';
                list.appendChild(entry);
            }
        };
    }
};