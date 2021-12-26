// Client ID and API key from the Developer Console
const CLIENT_ID = secret.CLIENT_ID;
const API_KEY = secret.API_KEY;

// Array of API discovery doc URLs for APIs used by the quickstart
const DISCOVERY_DOCS = [
  'https://docs.googleapis.com/$discovery/rest?version=v1',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = "https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/drive";
const COVER_LETTER_ID = '1XZW1oxj9bg1_Fdx5lVY_dcL32vejfpeKZBCJrOVck_4';
const RESUME_ID = '1DgCdckTxpLvB90F-_l1ck5V1F3JuihCqeXl_WplCx-U';
const TEST_FILE_ID = '1ZWLWWJ2jeyUO83BgX4R6Sun_0kANVoCDTAa8k8oRYfM';
var curDoc;

// Firebase
const firebase = require("firebase");
require("firebase/firestore");
const firebaseConfig = {
  apiKey: "AIzaSyABfbmVqshenxAFuNxub0EDJhE7Z-5v6oE",
  authDomain: "cv-generator-336021.firebaseapp.com",
  projectId: "cv-generator-336021",
  storageBucket: "cv-generator-336021.appspot.com",
  messagingSenderId: "469133785919",
  appId: "1:469133785919:web:b2b2b526acb7951119718a"
};
const fbApp = firebase.initializeApp(config);
const db = firebase.firestore(fbApp);

// DOM
var authorizeButton = document.getElementById('authorize_button');
var signoutButton = document.getElementById('signout_button');
var makeEditsButton = document.getElementById('submit-edits');
var testButton = document.getElementById('test-button');
var editForm = document.getElementById('edit-form');
var waitingSection = document.getElementById('waiting-section');
var progressText = document.getElementById('progress-text');
var companyName = document.getElementById('company-name');
var positionName = document.getElementById('position-name');


/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    authorizeButton.onclick = handleAuthClick;
    signoutButton.onclick = handleSignoutClick;
    makeEditsButton.onclick = handleMakeEdits;
    testButton.onclick = handleTestButton;
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  authorizeButton.style.display = isSignedIn ? 'none' : 'initial';
  signoutButton.style.display = isSignedIn ? 'initial' : 'none';
  makeEditsButton.style.display = isSignedIn ? 'initial' : 'none';
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  event.preventDefault();
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  event.preventDefault();
  gapi.auth2.getAuthInstance().signOut();
}

/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
  var pre = document.getElementById('content');
  var textContent = document.createTextNode(message + '\n');
  pre.appendChild(textContent);
}

function setProgress(message) {
  progressText.textContent = message;
}

/**
 * Prints the title of a sample doc:
 * https://docs.google.com/document/d/195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE/edit
 */
function printDocTitle() {
  gapi.client.request(`https://docs.googleapis.com/v1/documents/${TEST_FILE_ID}`
  ).then(function (response) {
    var doc = response.result;
    curDoc = doc;
    console.log(doc);
  }, function (response) {
    appendPre('Error: ' + response.result.error.message);
  });
}

/**
 * Generates a replace json for the replace request
 */
function generateReplaceRequests() {
  let json = [];
  let valuePairs = [
    ["COMPANY_NAME", companyName.value],
    ["POSITION_NAME", positionName.value],
  ];

  valuePairs.forEach(x => {
    json.push({
      replaceAllText: {
        replaceText: x[1],
        containsText: {
          "text": x[0],
          "matchCase": true
        }
      }
    })
  });

  return json;
}

/**
 * 1: make duplicate & rename
 * 2: insert extra text (if required)
 * 3: generate company profile in firebase
 * 4: replace links & company name & anything else
 * 5: download pdf
 */
async function handleMakeEdits(e) {
  e.preventDefault();

  editForm.style.display = 'none';
  waitingSection.style.display = 'block';

  // 0: generate new firebase id
  let newFbDoc = await db.collection("clicks").doc().set({
    company: companyName.value,
    position: positionName.value,
    version: 1,
    click_dictater: 0,
    click_hackathon: 0,
    click_linkedin: 0,
    click_portfolio: 0,
    cl_version: 1,
    resume_version: 1
  });

  // 1: duplicate
  setProgress("Duplicating base cover letter...");
  let copyRes = await gapi.client.drive.files.copy({
    fileId: COVER_LETTER_ID,
    fields: "id"
  });
  console.log("COPY: ", copyRes);
  let newDocId = copyRes.result.id;

  // 1: rename new doc
  setProgress("Renaming duplicate cover letter...");
  let renameRes = await gapi.client.drive.files.update({
    fileId: newDocId,
    resource: {
      name: `${companyName.value} Cover Letter`
    }
  });
  console.log("RENAME: ", renameRes);

  // 1: get new doc
  setProgress("Retrieving newly duplicated document...");
  let copyReq = await gapi.client.request(`https://docs.googleapis.com/v1/documents/${newDocId}`);
  curDoc = copyReq.result;
  console.log("NEW DOC: ", curDoc);

  // 4: replacement
  setProgress("Replacing key text in document...");
  let replacement = await gapi.client.docs.documents.batchUpdate({
    documentId: curDoc.documentId,
    resource: {
      requests: generateReplaceRequests(),
      writeControl: {
        "targetRevisionId": curDoc.revisionId
      }
    },
  });
  console.log("REPLACEMENT: ", replacement);

  // 5: download as pdf
  window.open(`https://docs.google.com/document/d/${curDoc.documentId}/export?format=pdf`, '_blank');


  setProgress("Finished!");

  await delay(5000);
  editForm.style.display = 'block';
  waitingSection.style.display = 'none';
}

const delay = ms => new Promise(res => setTimeout(res, ms));

function handleTestButton() {
  console.log(gapi.client);
}

function replaceLinks(doc, id) {
  
}
