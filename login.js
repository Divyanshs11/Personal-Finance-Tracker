import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
        import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
        import { getFirestore, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyDvMilVP8LClwruDBlazeoYYgoiwSpfROQ",
            authDomain: "finance-tracker-a7593.firebaseapp.com",
            projectId: "finance-tracker-a7593",
            storageBucket: "finance-tracker-a7593.appspot.com",
            messagingSenderId: "27947290444",
            appId: "1:27947290444:web:f875515390231719f6c9e9"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const provider = new GoogleAuthProvider();

        console.log("Firebase initialized");

        function getElement(id) {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`Element with id "${id}" not found`);
            }
            return element;
        }

        const signInForm = getElement("sign-in-form");
        const signUpForm = getElement("sign-up-form");
        const switchToSignup = getElement("switch-to-signup");
        const switchToSignin = getElement("switch-to-signin");
        const googleSignInButton = getElement("google-sign-in");
        const errorMessage = getElement("error-message");
        const signupErrorMessage = getElement("signup-error-message");

        if (switchToSignup) {
            switchToSignup.addEventListener("click", (e) => {
                e.preventDefault();
                if (signInForm) signInForm.style.display = "none";
                if (signUpForm) signUpForm.style.display = "block";
                if (errorMessage) errorMessage.textContent = "";
                if (signupErrorMessage) signupErrorMessage.textContent = "";
            });
        }

        if (switchToSignin) {
            switchToSignin.addEventListener("click", (e) => {
                e.preventDefault();
                if (signUpForm) signUpForm.style.display = "none";
                if (signInForm) signInForm.style.display = "block";
                if (errorMessage) errorMessage.textContent = "";
                if (signupErrorMessage) signupErrorMessage.textContent = "";
            });
        }

        if (signUpForm) {
            signUpForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const email = getElement("email").value;
                const password = getElement("signup-password").value;
                const name = getElement("name").value;

                if (!email || !password || !name) {
                    if (signupErrorMessage) signupErrorMessage.textContent = "Please fill in all fields.";
                    return;
                }

                console.log("Sign up attempt for:", email);

                try {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    const user = userCredential.user;
                    console.log("User created:", user.uid);
                    await setDoc(doc(db, "users", user.uid), {
                        name: name,
                        email: email
                    });
                    console.log("User document created in Firestore");
                    alert("Sign-up successful! Please log in.");
                    if (signUpForm) signUpForm.style.display = "none";
                    if (signInForm) signInForm.style.display = "block";
                } catch (error) {
                    console.error("Error during sign-up:", error.code, error.message);
                    if (signupErrorMessage) signupErrorMessage.textContent = `Sign-up error: ${error.message}`;
                }
            });
        }

        if (signInForm) {
            signInForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const email = getElement("sign-in-email").value.trim();
                const password = getElement("sign-in-password").value.trim();

                if (!email || !password) {
                    if (errorMessage) errorMessage.textContent = "Please enter both email and password.";
                    return;
                }

                console.log("Sign in attempt for:", email);

                signInWithEmailAndPassword(auth, email, password)
                    .then((userCredential) => {
                        const user = userCredential.user;
                        console.log("User signed in:", user.uid);
                        alert("Sign-in successful!");
                        window.location.href = "main.html";  // Redirect to your main page
                    })
                    .catch((error) => {
                        console.error("Error during sign-in:", error.code, error.message);
                        if (errorMessage) errorMessage.textContent = `Sign-in error: ${error.message}`;
                    });
            });
        }

        if (googleSignInButton) {
            googleSignInButton.addEventListener("click", () => {
                signInWithPopup(auth, provider)
                    .then((result) => {
                        const user = result.user;
                        console.log("User signed in with Google:", user.uid);
                        alert("Google Sign-in successful!");
                        window.location.href = "main.html";  // Redirect to your main page
                    })
                    .catch((error) => {
                        console.error("Error during Google sign-in:", error.code, error.message);
                        if (errorMessage) {
                            if (error.code === 'auth/popup-closed-by-user') {
                                errorMessage.textContent = "Google Sign-in was cancelled. Please try again.";
                            } else {
                                errorMessage.textContent = `Google Sign-in error: ${error.message}`;
                            }
                        }
                    });
            });
        }

        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log("User is signed in:", user.uid);
                // Uncomment the next line if you want automatic redirection
                // window.location.href = 'main.html';
            } else {
                console.log("No user is signed in.");
            }
        });

        // Test Firebase connection
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log("Firebase connection successful. Current user:", user.uid);
            } else {
                console.log("Firebase connection successful. No user signed in.");
            }
        });