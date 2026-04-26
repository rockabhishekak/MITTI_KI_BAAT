const App = {
    state: {
        selectedImageFile: null,
    },

    async init() {
        this.renderAuthButtons();
        this.bindSignInButtons();
        this.bindNavigationButtons();
        this.bindCropCards();
        this.bindIdentifyFlow()
        this.bindContactFlow();
        this.bindLoginFlow();

        await this.loadCropsMeta();
        await this.loadAdvisoryMeta();
        await this.loadContactFaqs();
        await this.loadNetworkStats();
    },

    bindSignInButtons() {
        const signInButtons = document.querySelectorAll(".btn");
        if (!signInButtons.length) return;

        const onLoginPage = window.location.pathname.toLowerCase().endsWith("login.html");
        if (onLoginPage) return;

        signInButtons.forEach((button) => {
            if (button.classList.contains("profile-btn")) return;
            button.addEventListener("click", () => {
                window.location.href = "login.html";
            });
        });
    },

    renderAuthButtons() {
        const navbarButtons = document.querySelectorAll(".navbar .btn");
        if (!navbarButtons.length) return;

        const token = localStorage.getItem("mkbAuthToken");
        const email = localStorage.getItem("mkbUserEmail") || "User";
        const isLoggedIn = Boolean(token);

        navbarButtons.forEach((button) => {
            button.classList.remove("profile-btn");
            button.removeAttribute("title");

            if (!isLoggedIn) {
                button.textContent = "Sign In";
                return;
            }

            const initial = email.charAt(0).toUpperCase();
            button.classList.add("profile-btn");
            button.textContent = initial || "U";
            button.title = `${email} (click to logout)`;
            button.setAttribute("aria-label", "Open profile");

            button.addEventListener("click", () => {
                const shouldLogout = window.confirm(`Logged in as ${email}.\nPress OK to logout.`);
                if (!shouldLogout) return;

                localStorage.removeItem("mkbAuthToken");
                localStorage.removeItem("mkbUserEmail");
                window.location.href = "index.html";
            });
        });
    },

    bindNavigationButtons() {
        const identifyNow = document.querySelector(".primary");
        const exploreCrops = document.querySelector(".secondary");

        if (identifyNow) {
            identifyNow.addEventListener("click", () => {
                window.location.href = "identify.html";
            });
        }

        if (exploreCrops) {
            exploreCrops.addEventListener("click", () => {
                window.location.href = "crops.html";
            });
        }
    },

    bindCropCards() {
        const cropCards = document.querySelectorAll(".crop-catalog-card");
        if (!cropCards.length) return;

        cropCards.forEach((card) => {
            card.style.cursor = "pointer";
            card.addEventListener("click", () => {
                window.location.href = "advisory.html";
            });
        });
    },

    bindIdentifyFlow() {
        const fileInput = document.querySelector("#pest-image");
        const identifyButton = document.querySelector(".identify-btn");
        const preview = document.querySelector("#identifyPreview");
        const dropzone = document.querySelector("#identifyDropzone");
        const uploadStatus = document.querySelector("#identifyUploadStatus");
        if (!fileInput || !identifyButton || !preview || !dropzone) return;

        const setSelectedFile = (file) => {
            if (!file) return false;
            if (!file.type || !file.type.startsWith("image/")) {
                if (uploadStatus) {
                    uploadStatus.textContent = "Please upload an image file (JPG/PNG).";
                }
                return false;
            }

            this.state.selectedImageFile = file;
            preview.src = URL.createObjectURL(file);
            if (uploadStatus) {
                uploadStatus.textContent = `Selected: ${file.name}`;
            }
            return true;
        };

        fileInput.addEventListener("change", (event) => {
            const target = event.target;
            const file = target.files && target.files[0];
            setSelectedFile(file);
        });

        ["dragenter", "dragover"].forEach((eventName) => {
            dropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dropzone.classList.add("drag-active");
            });
        });

        ["dragleave", "drop"].forEach((eventName) => {
            dropzone.addEventListener(eventName, (event) => {
                event.preventDefault();
                dropzone.classList.remove("drag-active");
            });
        });

        dropzone.addEventListener("drop", (event) => {
            const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
            const ok = setSelectedFile(file);
            if (!ok) return;

            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
        });

        identifyButton.addEventListener("click", async () => {
            if (!this.state.selectedImageFile) {
                const originalText = identifyButton.textContent;
                identifyButton.textContent = "Select image first";
                if (uploadStatus) {
                    uploadStatus.textContent = "Drop an image or select from device first.";
                }
                setTimeout(() => {
                    identifyButton.textContent = originalText;
                }, 1200);
                return;
            }

            identifyButton.disabled = true;
            identifyButton.textContent = "Identifying...";

            try {
                const response = await this.apiPost("/api/identify", {
                    fileName: this.state.selectedImageFile.name,
                });
                const result = response.result || response;

                this.updateIdentifyResult(result);
                if (uploadStatus) {
                    uploadStatus.textContent = `Matched: ${result.pestName || "Unknown pest"}`;
                }
            } catch (error) {
                const originalText = identifyButton.textContent;
                identifyButton.textContent = "Try again";
                if (uploadStatus) {
                    uploadStatus.textContent = "Identification failed. Please try another image.";
                }
                setTimeout(() => {
                    identifyButton.textContent = originalText;
                }, 1200);
            } finally {
                identifyButton.disabled = false;
                identifyButton.textContent = "Identify Pest";
            }
        });
    },

    updateIdentifyResult(result) {
        const family = document.querySelector("#identifyFamily");
        const pestName = document.querySelector("#identifyName");
        const scientific = document.querySelector("#identifyScientific");
        const description = document.querySelector("#identifyDescription");
        const alert = document.querySelector("#identifyAlert");
        const preview = document.querySelector("#identifyPreview");

        if (family) family.textContent = String(result.family || "UNKNOWN FAMILY").toUpperCase();
        if (pestName) pestName.textContent = result.pestName || "Unknown Pest";
        if (scientific) scientific.textContent = result.scientificName || "Unknown";
        if (description) description.textContent = result.description || "No details available.";
        if (alert) alert.textContent = String(result.alert || "MODERATE ALERT").toUpperCase();
        if (preview && result.imageUrl) {
            preview.src = result.imageUrl;
        }
    },

    bindContactFlow() {
        const form = document.querySelector(".query-form");
        if (!form) return;

        const feedback = form.querySelector(".form-feedback");

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData(form);
            const payload = {
                fullName: String(formData.get("fullName") || "").trim(),
                email: String(formData.get("email") || "").trim(),
                message: String(formData.get("message") || "").trim(),
            };

            const errors = this.validateContactPayload(payload);
            if (errors.length) {
                if (feedback) {
                    feedback.textContent = errors.join(" ");
                    feedback.classList.remove("success");
                    feedback.classList.add("error");
                }
                return;
            }

            const submitButton = form.querySelector("button[type='submit']");
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Submitting...";
            }

            try {
                const result = await this.apiPost("/api/contact", payload);
                if (feedback) {
                    feedback.textContent = result.message || "Query submitted successfully.";
                    feedback.classList.remove("error");
                    feedback.classList.add("success");
                }
                form.reset();
            } catch (error) {
                if (feedback) {
                    feedback.textContent = error.message || "Could not submit your query right now. Please try again.";
                    feedback.classList.remove("success");
                    feedback.classList.add("error");
                }
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = "Submit Query";
                }
            }
        });
    },

    bindLoginFlow() {
        const loginForm = document.querySelector(".login-form");
        const registerForm = document.querySelector(".register-form");
        const modeButtons = document.querySelectorAll(".auth-mode-btn");

        if (!loginForm) return;

        const loginFeedback = loginForm.querySelector(".login-feedback");
        const loginSubmitButton = loginForm.querySelector(".login-submit");

        const switchAuthMode = (mode) => {
            modeButtons.forEach((button) => {
                const isActive = button.getAttribute("data-auth-mode") === mode;
                button.classList.toggle("active", isActive);
            });

            if (mode === "register" && registerForm) {
                loginForm.hidden = true;
                registerForm.hidden = false;
            } else if (registerForm) {
                loginForm.hidden = false;
                registerForm.hidden = true;
            }
        };

        modeButtons.forEach((button) => {
            button.addEventListener("click", () => {
                const mode = button.getAttribute("data-auth-mode") || "login";
                switchAuthMode(mode);
            });
        });

        switchAuthMode("login");

        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData(loginForm);
            const payload = {
                email: String(formData.get("email") || "").trim(),
                password: String(formData.get("password") || ""),
                remember: Boolean(formData.get("remember"))
            };

            const errors = [];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (!emailRegex.test(payload.email)) {
                errors.push("Enter a valid email address.");
            }
            if (payload.password.length < 6) {
                errors.push("Password should be at least 6 characters.");
            }

            if (errors.length) {
                if (loginFeedback) {
                    loginFeedback.textContent = errors.join(" ");
                    loginFeedback.classList.remove("success");
                    loginFeedback.classList.add("error");
                }
                return;
            }

            if (loginSubmitButton) {
                loginSubmitButton.disabled = true;
                loginSubmitButton.textContent = "Signing in...";
            }

            try {
                const result = await this.apiPost("/api/login", payload);
                localStorage.setItem("mkbAuthToken", result.token || "session-token");
                localStorage.setItem("mkbUserEmail", payload.email);

                if (loginFeedback) {
                    loginFeedback.textContent = "Login successful. Redirecting...";
                    loginFeedback.classList.remove("error");
                    loginFeedback.classList.add("success");
                }

                setTimeout(() => {
                    window.location.href = "index.html";
                }, 700);
            } catch (error) {
                if (loginFeedback) {
                    loginFeedback.textContent = "Invalid email or password.";
                    loginFeedback.classList.remove("success");
                    loginFeedback.classList.add("error");
                }
            } finally {
                if (loginSubmitButton) {
                    loginSubmitButton.disabled = false;
                    loginSubmitButton.textContent = "Sign In";
                }
            }
        });

        if (!registerForm) return;

        const registerFeedback = registerForm.querySelector(".register-feedback");
        const registerSubmitButton = registerForm.querySelector(".register-submit");

        registerForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            const formData = new FormData(registerForm);
            const payload = {
                name: String(formData.get("name") || "").trim(),
                email: String(formData.get("email") || "").trim(),
                password: String(formData.get("password") || ""),
                confirmPassword: String(formData.get("confirmPassword") || "")
            };

            const errors = [];
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (payload.name.length < 3) {
                errors.push("Name should be at least 3 characters.");
            }
            if (!emailRegex.test(payload.email)) {
                errors.push("Enter a valid email address.");
            }
            if (payload.password.length < 6) {
                errors.push("Password should be at least 6 characters.");
            }
            if (payload.password !== payload.confirmPassword) {
                errors.push("Password and confirm password must match.");
            }

            if (errors.length) {
                if (registerFeedback) {
                    registerFeedback.textContent = errors.join(" ");
                    registerFeedback.classList.remove("success");
                    registerFeedback.classList.add("error");
                }
                return;
            }

            if (registerSubmitButton) {
                registerSubmitButton.disabled = true;
                registerSubmitButton.textContent = "Creating...";
            }

            try {
                await this.apiPost("/api/register", {
                    name: payload.name,
                    email: payload.email,
                    password: payload.password
                });

                if (registerFeedback) {
                    registerFeedback.textContent = "Registration successful. Please sign in.";
                    registerFeedback.classList.remove("error");
                    registerFeedback.classList.add("success");
                }

                registerForm.reset();
                switchAuthMode("login");
            } catch (error) {
                if (registerFeedback) {
                    registerFeedback.textContent = "Could not register. Email may already exist.";
                    registerFeedback.classList.remove("success");
                    registerFeedback.classList.add("error");
                }
            } finally {
                if (registerSubmitButton) {
                    registerSubmitButton.disabled = false;
                    registerSubmitButton.textContent = "Create Account";
                }
            }
        });
    },

    validateContactPayload(payload) {
        const errors = [];
        if (payload.fullName.length < 3) {
            errors.push("Enter a valid full name (min 3 characters).");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(payload.email)) {
            errors.push("Enter a valid email address.");
        }

        if (payload.message.length < 15) {
            errors.push("Message should be at least 15 characters.");
        }

        return errors;
    },

    async loadCropsMeta() {
        const cards = document.querySelectorAll(".crop-catalog-card[data-crop]");
        if (!cards.length) return;

        try {
            const response = await this.apiGet("/api/crops");
            const cropMap = new Map(response.crops.map((crop) => [crop.slug, crop]));

            cards.forEach((card) => {
                const slug = card.getAttribute("data-crop");
                const crop = cropMap.get(slug);
                if (!crop) return;

                const meta = card.querySelector(".crop-info p");
                if (meta) {
                    meta.textContent = crop.scientificName.toUpperCase();
                }
            });
        } catch (error) {
            console.error("Failed to load crops metadata", error);
        }
    },

    async loadAdvisoryMeta() {
        const advisoryName = document.querySelector("#advisoryPestName");
        if (!advisoryName) return;

        try {
            const response = await this.apiGet("/api/advisory/fall-armyworm");

            this.assignText("#advisoryPestName", response.pestName);
            this.assignText("#advisoryPestScientific", `(${response.scientificName})`);
            this.assignText("#advisoryPestIntro", response.summary);
            this.assignText("#advisoryDamageText", response.damageText);
            this.assignText("#advisoryYieldRisk", response.yieldRisk);
            this.assignText("#advisoryGrowthPhase", response.growthPhase);
        } catch (error) {
            console.error("Failed to load advisory metadata", error);
        }
    },

    async loadContactFaqs() {
        const faqContainer = document.querySelector(".faq-card");
        if (!faqContainer) return;

        try {
            const response = await this.apiGet("/api/faqs");
            const detailsBlocks = faqContainer.querySelectorAll("details");

            response.faqs.slice(0, detailsBlocks.length).forEach((faq, index) => {
                const details = detailsBlocks[index];
                const summary = details.querySelector("summary");
                const paragraph = details.querySelector("p");
                if (summary) summary.textContent = faq.question;
                if (paragraph) paragraph.textContent = faq.answer;
            });
        } catch (error) {
            console.error("Failed to load FAQs", error);
        }
    },

    async loadNetworkStats() {
        const metrics = document.querySelectorAll(".network-metrics strong");
        if (!metrics.length) return;

        try {
            const response = await this.apiGet("/api/stats");

            if (metrics[0]) metrics[0].textContent = response.responseRate;
            if (metrics[1]) metrics[1].textContent = response.monitoring;
        } catch (error) {
            console.error("Failed to load network stats", error);
        }
    },

    async apiGet(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`GET ${url} failed with status ${response.status}`);
        }
        return response.json();
    },

    async apiPost(url, payload) {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            const errorMessage =
                (data && typeof data.message === "string" && data.message.trim()) ||
                `POST ${url} failed with status ${response.status}`;
            throw new Error(errorMessage);
        }

        return data || {};
    },

    assignText(selector, value) {
        const element = document.querySelector(selector);
        if (element && typeof value === "string") {
            element.textContent = value;
        }
    },
};

document.addEventListener("DOMContentLoaded", () => {
    App.init();
});