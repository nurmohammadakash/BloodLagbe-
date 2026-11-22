// =====================================================
// BLOOD-LAGBE
// verify-email.js
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

    const verifyForm = document.getElementById("verifyForm");
    const otpInput = document.getElementById("otp");
    const verifyButton = document.getElementById("verifyButton");
    const message = document.getElementById("message");

    // =====================================================
    // GET EMAIL FROM REGISTRATION
    // =====================================================

    const verificationEmail =
        sessionStorage.getItem("bloodLagbeVerificationEmail");
    const verificationType =
        sessionStorage.getItem("bloodLagbeVerificationType") || "user";

    console.log(
        "📧 Verification email:",
        verificationEmail
    );


    // =====================================================
    // CHECK EMAIL
    // =====================================================

    if (!verificationEmail) {

        showMessage(
            "Verification session expired. Please register again.",
            "error"
        );

        if (verifyButton) {
            verifyButton.disabled = true;
        }

        return;
    }


    // =====================================================
    // OTP INPUT
    // =====================================================

    otpInput.addEventListener("input", () => {

        // Allow numbers only
        otpInput.value =
            otpInput.value.replace(/\D/g, "");

        // Maximum 6 digits
        if (otpInput.value.length > 6) {
            otpInput.value =
                otpInput.value.slice(0, 6);
        }

    });


    // =====================================================
    // MESSAGE FUNCTION
    // =====================================================

    function showMessage(text, type) {

        if (!message) return;

        message.textContent = text;

        message.className =
            `message ${type}`;

    }


    // =====================================================
    // VERIFY OTP
    // =====================================================

    verifyForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const otp =
                otpInput.value.trim();


            // =================================================
            // VALIDATE OTP
            // =================================================

            if (!/^\d{6}$/.test(otp)) {

                showMessage(
                    "Please enter the 6-digit OTP.",
                    "error"
                );

                return;
            }


            // =================================================
            // DISABLE BUTTON
            // =================================================

            verifyButton.disabled = true;

            verifyButton.textContent =
                "Verifying...";


            showMessage(
                "",
                ""
            );


            // =================================================
            // SEND REQUEST
            // =================================================

            try {

                console.log(
                    "📤 Sending OTP verification request..."
                );

                const response =
                    await fetch(
                        verificationType === "bloodbank"
                            ? "/api/bloodbank/verify-email"
                            : "/api/auth/verify-email",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                email:
                                    verificationEmail,

                                otp:
                                    otp
                            })
                        }
                    );


                const result =
                    await response.json();


                console.log(
                    "📥 Verification response:",
                    result
                );


                // =================================================
                // SUCCESS
                // =================================================

                if (
                    response.ok &&
                    result.success
                ) {

                    showMessage(
                        result.message ||
                        "Email verified successfully.",
                        "success"
                    );


                    /*
                     * The verification email is no
                     * longer needed after successful
                     * verification.
                     */

                    sessionStorage.removeItem(
                        "bloodLagbeVerificationEmail"
                    );
                    sessionStorage.removeItem("bloodLagbeVerificationType");


                    /*
                     * Redirect to login after a
                     * short delay.
                     */

                    setTimeout(() => {

                        window.location.href =
                            "/login";

                    }, 1500);


                    return;
                }


                // =================================================
                // ERROR
                // =================================================

                showMessage(
                    result.message ||
                    "Invalid or expired OTP.",
                    "error"
                );


            } catch (error) {

                console.error(
                    "❌ OTP verification request failed:",
                    error
                );

                showMessage(
                    "Unable to connect to the server. Please try again.",
                    "error"
                );

            } finally {

                verifyButton.disabled = false;

                verifyButton.textContent =
                    "Verify Email";

            }

        }
    );

});