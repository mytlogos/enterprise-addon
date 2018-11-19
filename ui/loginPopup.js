function forgot() {
    let mailInput = document.querySelector("form input[name=mail]");
    let mail = mailInput.value;

    browser.runtime.sendMessage({
        popup: {forgot: mail}
    }).catch(error => {

        let errorText = document.querySelector(".error");
        errorText.classList.remove("hidden");
        errorText.textContent = "Sending mail failed!";
        console.log(error);
    });
}

function login() {
    let pswInput = document.querySelector("form input[name=psw]");
    let nameInput = document.querySelector("form input[name=userName]");
    let name = nameInput.value;
    let psw = pswInput.value;

    browser.runtime
        .sendMessage({
            popup:
                {
                    login: {name, psw}
                }
        })
        .then(result => {
            pswInput.value = "";
            nameInput.value = "";
            window.close();
        })
        .catch(error => {
            let errorText = document.querySelector(".error");
            errorText.classList.remove("hidden");
            errorText.textContent = "Login failed!";
            console.log(error);
        });
}

function register() {
    let pswInput = document.querySelector("form input[name=psw]");
    let psw = pswInput.value;
    let pswRepeatInput = document.querySelector("form input[name=psw]");
    let pswRepeat = pswInput.value;
    let nameInput = document.querySelector("form input[name=userName]");
    let name = nameInput.value;

    browser.runtime
        .sendMessage({
            popup:
                {
                    register: {name, psw, pswRepeat}
                }
        })
        .then(result => {
            pswInput.value = "";
            pswRepeatInput.value = "";
            nameInput.value = "";
            window.close();
        })
        .catch(error => {
            let errorText = document.querySelector(".error");
            errorText.classList.remove("hidden");
            errorText.textContent = "Register failed!";
            console.log(error);
        });
}

let currentHandler = login;


document.querySelector("main .forgot a").addEventListener("click", () => {
    switchVisibility({
        hide:
            "form input[name=psw], " +
            "form label[for=psw]," +
            "form input[name=psw-repeat], " +
            "form label[for=psw-repeat]," +
            "form input[name=userName], " +
            "form label[for=userName]," +
            "main .forgot",
        show:
            "form input[name=mail], " +
            "form label[for=mail]," +
            ".register," +
            ".login"
    });

    currentHandler = forgot;
});
document.querySelector("main .register a").addEventListener("click", () => {
    switchVisibility({
        show:
            "form input[name=psw], " +
            "form label[for=psw]," +
            "form input[name=psw-repeat], " +
            "form label[for=psw-repeat]," +
            "form input[name=userName], " +
            "form label[for=userName]," +
            ".login",
        hide:
            "form input[name=mail], " +
            "form label[for=mail]," +
            ".register," +
            ".forgot",
    });

    currentHandler = register;
});
document.querySelector("main .login a").addEventListener("click", () => {
    switchVisibility({
        show:
            "form input[name=psw], " +
            "form label[for=psw]," +
            "form input[name=userName], " +
            "form label[for=userName]," +
            ".forgot," +
            ".register",
        hide:
            "form input[name=mail], " +
            "form label[for=mail]," +
            "form input[name=psw-repeat], " +
            "form label[for=psw-repeat]," +
            ".login"
    });

    currentHandler = login;
});
document.querySelector("button.finish").addEventListener("click", currentHandler);
document.querySelectorAll("input").forEach(value => value.addEventListener("keyup", evt => {
    if (evt.key === "Enter") {
        currentHandler();
    }
}));

function switchVisibility({hide, show}) {
    document.querySelectorAll(hide).forEach(value => value.classList.add("hidden"));
    document.querySelectorAll(show).forEach(value => value.classList.remove("hidden"));
}
