function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
            tmp = item.split("=");
            if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
}

const firebaseConfig = {
    apiKey: "AIzaSyABfbmVqshenxAFuNxub0EDJhE7Z-5v6oE",
    authDomain: "cv-generator-336021.firebaseapp.com",
    projectId: "cv-generator-336021",
    storageBucket: "cv-generator-336021.appspot.com",
    messagingSenderId: "469133785919",
    appId: "1:469133785919:web:b2b2b526acb7951119718a"
};
const fbApp = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(fbApp);

// increment if it exists
const knownLinks = {
    "https://www.linkedin.com/in/jeremy-boetticher": "click_linkedin",
    "https://www.linkedin.com/in/jeremy-boetticher/": "click_linkedin",
    "https://www.dictatergame.com": "click_dictater",
    "https://www.dictatergame.com/": "click_dictater",
    "https://projk.net/jeremy": "click_portfolio",
    "https://projk.net/jeremy/": "click_portfolio"
};

const link = findGetParameter("link");
const id = findGetParameter("id");
const increment = firebase.firestore.FieldValue.increment(1);
const docRef = db.collection("clicks").doc(id);

console.log(knownLinks[link], docRef);

let fbUpdateObj = {};
fbUpdateObj[knownLinks[link] ?? `click_other`] = increment;
console.log(fbUpdateObj);
docRef.update(fbUpdateObj)
    .then(function (res) {
        window.location.replace(link);
    })
    .catch(function (res) {
        window.location.replace(link);
    });
