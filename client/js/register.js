// =====================================================
// BLOOD-LAGBE
// register.js
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // FORM ELEMENTS
    // =====================================================

    const registerForm = document.getElementById("registerForm");
    const registerButton = document.getElementById("registerButton");
    const buttonText = registerButton?.querySelector(".button-text");
    const buttonLoader = registerButton?.querySelector(".button-loader");
    const registerMessage = document.getElementById("registerMessage");

    // Personal information
    const fullName = document.getElementById("fullName");
    const dateOfBirth = document.getElementById("dateOfBirth");
    const gender = document.getElementById("gender");
    const email = document.getElementById("email");
    const phone = document.getElementById("phone");
    const bloodGroup = document.getElementById("bloodGroup");
    const userRole = document.getElementById("userRole");

    // Address
    const division = document.getElementById("division");
    const district = document.getElementById("district");
    const upazila = document.getElementById("upazila");
    const postalCode = document.getElementById("postalCode");
    const fullAddress = document.getElementById("fullAddress");

    // Login credentials
    const username = document.getElementById("username");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    // Terms
    const terms = document.getElementById("terms");


    // =====================================================
    // CHECK FORM
    // =====================================================

    if (!registerForm) {
        console.error("❌ registerForm not found.");
        return;
    }


    // =====================================================
    // MESSAGE FUNCTIONS
    // =====================================================

    function showMessage(message, type = "error") {

        if (!registerMessage) return;

        registerMessage.textContent = message;
        registerMessage.className = `auth-message ${type}`;
    }


    function clearMessage() {

        if (!registerMessage) return;

        registerMessage.textContent = "";
        registerMessage.className = "auth-message";
    }


    // =====================================================
    // FIELD ERROR FUNCTIONS
    // =====================================================

    function showFieldError(fieldId, message) {

        const errorElement =
            document.getElementById(`${fieldId}Error`);

        if (errorElement) {
            errorElement.textContent = message;
        }
    }


    function clearFieldErrors() {

        document.querySelectorAll(".field-error").forEach(error => {
            error.textContent = "";
        });
    }


    // =====================================================
    // USERNAME AVAILABILITY / SUGGESTIONS
    // =====================================================

    let usernameCheckTimer;
    username?.addEventListener("input", () => {
        clearTimeout(usernameCheckTimer);
        const status = document.getElementById("usernameStatus");
        const value = username.value.trim();
        if (!status || value.length < 3) { if (status) status.textContent = ""; return; }
        usernameCheckTimer = setTimeout(async () => {
            try {
                const response = await fetch(`/api/public/username-check?username=${encodeURIComponent(value)}`);
                const data = await response.json();
                if (data.available) {
                    status.textContent = "Username is available.";
                    status.style.color = "#64d88a";
                } else {
                    const suggestions = (data.suggestions || []).filter(item => item !== value).slice(0, 4);
                    status.textContent = `Username exists. Suggestions: ${suggestions.join(", ") || "try another username"}`;
                    status.style.color = "#ff5360";
                }
            } catch {
                status.textContent = "Could not check username right now.";
                status.style.color = "#ff5360";
            }
        }, 350);
    });

    // =====================================================
    // PASSWORD TOGGLE
    // =====================================================

    document.querySelectorAll(".password-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const targetId = button.dataset.target;
            const input = document.getElementById(targetId);

            if (!input) return;

            if (input.type === "password") {

                input.type = "text";

                button.textContent = "Hide";

                button.setAttribute(
                    "aria-label",
                    "Hide password"
                );

            } else {

                input.type = "password";

                button.textContent = "Show";

                button.setAttribute(
                    "aria-label",
                    "Show password"
                );
            }

        });

    });


    // =====================================================
    // BANGLADESH LOCATION DATA
    // =====================================================

    const locations = window.BangladeshLocations;;


    // =====================================================
    // LOCATION FUNCTIONS
    // =====================================================

    function loadDivisions() {

        if (!division) return;

        division.innerHTML = `
            <option value="" selected disabled>
                Select your division
            </option>
        `;

        Object.keys(locations).forEach(divisionName => {

            const option = document.createElement("option");

            option.value = divisionName;
            option.textContent = divisionName;

            division.appendChild(option);
        });
    }


    function loadDistricts(selectedDivision) {

        if (!district || !upazila) return;

        district.innerHTML = `
            <option value="" selected disabled>
                Select your district
            </option>
        `;

        upazila.innerHTML = `
            <option value="" selected disabled>
                Select district first
            </option>
        `;

        district.disabled = true;
        upazila.disabled = true;

        const divisionData = locations[selectedDivision];

        if (!divisionData) return;

        Object.keys(divisionData).forEach(districtName => {

            const option = document.createElement("option");

            option.value = districtName;
            option.textContent = districtName;

            district.appendChild(option);
        });

        district.disabled = false;
    }


    function loadUpazilas(selectedDivision, selectedDistrict) {

        if (!upazila) return;

        upazila.innerHTML = `
            <option value="" selected disabled>
                Select your upazila / thana
            </option>
        `;

        upazila.disabled = true;

        const upazilas =
            locations[selectedDivision]?.[selectedDistrict];

        if (!upazilas) return;

        upazilas.forEach(upazilaName => {

            const option = document.createElement("option");

            option.value = upazilaName;
            option.textContent = upazilaName;

            upazila.appendChild(option);
        });

        upazila.disabled = false;
    }


    // =====================================================
    // LOCATION EVENTS
    // =====================================================

    division?.addEventListener("change", () => {

        clearMessage();

        loadDistricts(division.value);
    });


    district?.addEventListener("change", () => {

        clearMessage();

        loadUpazilas(
            division.value,
            district.value
        );
    });


    // Load divisions immediately
    loadDivisions();


    // =====================================================
    // VALIDATION
    // =====================================================

    // =====================================================
// VALIDATION
// =====================================================

function validateForm() {

    clearMessage();
    clearFieldErrors();

    let valid = true;
    let errors = [];

    // =================================================
    // HELPER
    // =================================================

    function check(condition, fieldId, message) {

        if (condition) {
            return;
        }

        valid = false;
        errors.push({
            field: fieldId,
            message: message
        });

        showFieldError(fieldId, message);

        const field = document.getElementById(fieldId);

        if (field) {
            field.classList.add("input-error");
        }

        console.error(
            `❌ Validation failed: ${fieldId} → ${message}`
        );
    }


    // =================================================
    // FULL NAME
    // =================================================

    check(
        fullName && fullName.value.trim() !== "",
        "fullName",
        "Please enter your full name."
    );


    // =================================================
    // DATE OF BIRTH
    // =================================================

    check(
        dateOfBirth && dateOfBirth.value !== "",
        "dateOfBirth",
        "Please select your date of birth."
    );


    // =================================================
    // GENDER
    // =================================================

    check(
        gender && gender.value !== "",
        "gender",
        "Please select your gender."
    );


    // =================================================
    // EMAIL
    // =================================================

    const emailValue =
        email?.value.trim() || "";

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    check(
        emailValue !== "" &&
        emailRegex.test(emailValue),
        "email",
        "Please enter a valid email address."
    );


    // =================================================
    // PHONE
    // =================================================

    const phoneValue =
        phone?.value.trim() || "";

    const phoneRegex =
        /^01[3-9]\d{8}$/;

    check(
        phoneValue !== "" &&
        phoneRegex.test(phoneValue),
        "phone",
        "Enter a valid Bangladesh mobile number, e.g. 01712345678."
    );


    // =================================================
    // BLOOD GROUP
    // =================================================

    check(
        bloodGroup && bloodGroup.value !== "",
        "bloodGroup",
        "Please select your blood group."
    );


    // =================================================
    // ROLE
    // =================================================

    check(
        userRole && userRole.value !== "",
        "userRole",
        "Please select your Blood-Lagbe role."
    );


    // =================================================
    // DIVISION
    // =================================================

    check(
        division && division.value !== "",
        "division",
        "Please select your division."
    );


    // =================================================
    // DISTRICT
    // =================================================

    check(
        district && district.value !== "",
        "district",
        "Please select your district."
    );


    // =================================================
    // UPAZILA
    // =================================================

    check(
        upazila && upazila.value !== "",
        "upazila",
        "Please select your upazila / thana."
    );


    // =================================================
    // POSTAL CODE
    // =================================================

    const postalValue =
        postalCode?.value.trim() || "";

    check(
        /^\d{4}$/.test(postalValue),
        "postalCode",
        "Postal code must contain exactly 4 digits."
    );


    // =================================================
    // FULL ADDRESS
    // =================================================

    check(
        fullAddress &&
        fullAddress.value.trim() !== "",
        "fullAddress",
        "Please enter your full address."
    );


    // =================================================
    // USERNAME
    // =================================================

    const usernameValue =
        username?.value.trim() || "";

    check(
        usernameValue.length >= 3,
        "username",
        "Username must contain at least 3 characters."
    );


    // =================================================
    // PASSWORD
    // =================================================

    check(
        password &&
        password.value.length >= 8,
        "password",
        "Password must contain at least 8 characters."
    );


    // =================================================
    // CONFIRM PASSWORD
    // =================================================

    check(
        confirmPassword &&
        confirmPassword.value !== "" &&
        password &&
        password.value === confirmPassword.value,
        "confirmPassword",
        "Passwords do not match."
    );


    // =================================================
    // TERMS
    // =================================================

    if (!terms || !terms.checked) {

        valid = false;

        errors.push({
            field: "terms",
            message:
                "You must agree to the Terms & Conditions and Privacy Policy."
        });

        const termsError =
            document.getElementById("termsError");

        if (termsError) {
            termsError.textContent =
                "You must agree to the Terms & Conditions and Privacy Policy.";
        }

        console.error(
            "❌ Validation failed: terms"
        );
    }


    // =================================================
    // DEBUG OUTPUT
    // =================================================

    console.log("====================================");
    console.log("🔍 FORM VALIDATION RESULT");
    console.log("====================================");

    console.table(errors);

    console.log(
        "Valid:",
        valid
    );


    // =================================================
    // SHOW GENERAL ERROR
    // =================================================

    if (!valid) {

        showMessage(
            `Please correct ${errors.length} field(s) and try again.`,
            "error"
        );

        const firstInvalidField =
            errors.length > 0
                ? document.getElementById(errors[0].field)
                : null;

        if (firstInvalidField) {

            firstInvalidField.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            firstInvalidField.focus();
        }

    }


    return valid;
}

    // =====================================================
    // REGISTER SUBMIT
    // =====================================================

    registerForm.addEventListener("submit", async (event) => {

        event.preventDefault();

        clearMessage();
        clearFieldErrors();


        // =================================================
        // VALIDATE
        // =================================================

        if (!validateForm()) {

            // Scroll to first error
            const firstError =
                document.querySelector(
                    ".field-error:not(:empty)"
                );

            if (firstError) {

                firstError.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });
            }

            return;
        }


        // =================================================
        // DISABLE BUTTON
        // =================================================

        if (registerButton) {
            registerButton.disabled = true;
        }

        if (buttonText) {
            buttonText.hidden = true;
        }

        if (buttonLoader) {
            buttonLoader.hidden = false;
        }


        // =================================================
        // PREPARE DATA
        // =================================================

        const data = {

            full_name: fullName.value.trim(),

            date_of_birth: dateOfBirth.value,

            gender: gender.value,

            username: username.value.trim(),

            email: email.value.trim().toLowerCase(),

            password: password.value,

            confirmPassword: confirmPassword.value,

            phone: phone.value.trim(),

            division: division.value,

            district: district.value,

            upazila: upazila.value,

            postal_code: postalCode.value.trim(),

            blood_group: bloodGroup.value,

            role: userRole.value,

            address: fullAddress.value.trim(),
            latitude: document.getElementById("latitude")?.value || null,
            longitude: document.getElementById("longitude")?.value || null
        };


        console.log(
            "📤 Sending registration data:",
            {
                ...data,
                password: "********"
            }
        );


        // =================================================
        // API REQUEST
        // =================================================

        try {

            const response = await fetch(
                "/api/auth/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify(data)
                }
            );


            // =================================================
            // RESPONSE
            // =================================================

            const contentType =
                response.headers.get("content-type") || "";

            let result;


            if (contentType.includes("application/json")) {

                result = await response.json();

            } else {

                const text = await response.text();

                console.error(
                    "❌ Server returned non-JSON response:",
                    text
                );

                throw new Error(
                    "Server returned an unexpected response."
                );
            }


            console.log(
                "📥 Registration response:",
                result
            );


            // =================================================
            // ERROR RESPONSE
            // =================================================

            if (!response.ok || result.success === false) {

                let errorMessage =
                    result.message ||
                    "Registration failed. Please try again.";


                if (
                    Array.isArray(result.errors) &&
                    result.errors.length > 0
                ) {

                    const messages =
                        result.errors
                            .map(error => {

                                if (
                                    typeof error === "string"
                                ) {
                                    return error;
                                }

                                return (
                                    error.msg ||
                                    error.message ||
                                    null
                                );
                            })
                            .filter(Boolean);


                    if (messages.length > 0) {

                        errorMessage =
                            messages.join(" ");
                    }
                }


                showMessage(
                    errorMessage,
                    "error"
                );

                return;
            }


            // =================================================
            // SUCCESS
            // =================================================

            sessionStorage.setItem(
                "bloodLagbeVerificationEmail",
                data.email
            );
            sessionStorage.setItem("bloodLagbeVerificationType", "user");
            localStorage.setItem("bloodLagbeRegistered", "true");


            showMessage(
                result.message ||
                "Registration successful! Please check your email for the OTP.",
                "success"
            );


            // =================================================
            // REDIRECT TO VERIFY EMAIL
            // =================================================

            setTimeout(() => {

                window.location.href =
                    "/verify-email";

            }, 1200);

        }


        // =================================================
        // CATCH
        // =================================================

        catch (error) {

            console.error(
                "❌ Registration request failed:",
                error
            );

            showMessage(
                error.message ||
                "Unable to connect to the server. Please make sure Blood-Lagbe server is running.",
                "error"
            );
        }


        // =================================================
        // RESTORE BUTTON
        // =================================================

        finally {

            if (registerButton) {
                registerButton.disabled = false;
            }

            if (buttonText) {
                buttonText.hidden = false;
            }

            if (buttonLoader) {
                buttonLoader.hidden = true;
            }
        }

    });

});