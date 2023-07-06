// Description: Script for the evaluation webpage.

let currentQuestionIndex = 1;

// Store the model name mapping for later use.
const modelNameMapping = {
    "gpt35": "ChatGPT-3.5",
    "gpt4": "GPT-4",
    "vicuna": "Vicuna-13b",
    "bard": "Bard",
    "claude": "Claude",
};

const modelFigureMapping = {
    "vicuna": "figures/vicuna.jpeg",
    // Image from: https://common.wikimedia.org/wiki/File:ChatGPT_logo.svg
    "gpt35": "figures/chatgpt.svg",
    // Image from public domain.
    "bard": "figures/bard-2.jpg",
    // Image from: https://crfm.stanford.edu/2023/03/13/alpaca.html
}

// Store the question data in a list for later use.
const questionsList = [];
// Store the number of questions for later use.
let questionsCount = 0;

const discussionArea = document.getElementById('discussion-area');

function formatText(input) {
    input = input.replace(/&/g, '&amp;')
                 .replace(/</g, '&lt;')
                 .replace(/>/g, '&gt;')
                 .replace(/"/g, '&quot;')
                 .replace(/'/g, '&#x27;')
                 .replace(/\//g, '&#x2F;');
    return input.replace(/\n/g, '<br>');
}

function text2Markdown(text) {
    // Normalize the text for markdown rendering.
    text = text.trim().replaceAll('\n\n', '\n').replaceAll('\n', '\n\n');
    return marked.parse(text);
}

function capitalizeFirstChar(str) {
    if (!str || str.length === 0) {
      return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function updateQuestionSelect(question_id) {
    const select = document.getElementById('question-select');
    // Clear the question select.
    select.innerHTML = '';
    questionsList.forEach((question, index) => {
        if (index === 0) return;
        // make option
        const option = document.createElement('option');
        option.value = index.toString();
        option.textContent = question.reviewers
            .map(r => modelNameMapping[r]).join(' vs ')
            + ': ' + question.question;
        select.appendChild(option);
    });
    select.value = question_id;
}

function populateQuestions(questions) {
    questionsList[0] = null;
    questionsCount = questions.length;
    questions.forEach(question => {
        const q = question.question;
        // Store the question data in a mapping for later use.
        const modelA = question.reviewer_1_model;
        const modelB = question.reviewer_2_model;
        const reviewA = question['initial_justification_' + modelA];
        const reviewB = question['initial_justification_' + modelB];

        function formatDiscussion(discussion) {
            return discussion.slice(2).map(message => {
                const [model, response] = Object.entries(message)[0];
                response.model = model;
                response.content = response.content.split('[System]')[0];
                return response;
            });
        }

        questionsList.push({
            question: q,
            answers: [question.answer_a, question.answer_b],
            reviewers: [modelA, modelB],
            initial_reviews: [ reviewA, reviewB ],
            discussions: formatDiscussion(question[`${modelA}_${modelB}_discussion`]),
        });

        questionsList.push({
            question: q,
            answers: [question.answer_a, question.answer_b],
            reviewers: [modelB, modelA],
            initial_reviews: [ reviewB, reviewA ],
            discussions: formatDiscussion(question[`${modelB}_${modelA}_discussion`]),
        })

    });
    // Set the default category.
    updateQuestionSelect(currentQuestionIndex);
}

function displayQuestion(index) {
    // const question = questionsList[index].question;
    // document.getElementById('selected-question').innerHTML = text2Markdown('**Question:** ' + question); // "<strong>Question: </strong>" + formatText(question);
    console.log('index: ', index);
    displayAnswers(index);
}

function winMessage(preference) {
    switch (preference) {
        case 1:
            return 'Assistant A is better';
        case 2:
            return 'Assistant B is better';
        case 3:
            return 'Both assistants are equally good';
    }
}

function makeDiscussionMessageView({model, content, preference}, colorClass){
    const betterModelMessage = winMessage(preference);
    const div = document.createElement('div');
    div.className = "card expandable-card mb-4";
    div.innerHTML = `
        <div class="card-header pad-card-bottom ${colorClass}" >${modelNameMapping[model]}: ${betterModelMessage}</div>
        <div class="card-body">
            <div class="card-text-container">
                <div class="card-text" >${text2Markdown(content)}</div>
            </div>
            <div class="btn btn-primary expand-btn" style="display:flex;"></div>
        </div>`;

    const expandBtn = div.getElementsByClassName('expand-btn')[0];
    expandBtn.addEventListener('click', e => {
        const card = e.target.closest('.expandable-card');
        card.classList.toggle('expanded');
        const more = '<i class="material-icons" style="pointer-events: none">keyboard_arrow_down</i> Show more';
        const less = '<i class="material-icons" style="pointer-events: none">keyboard_arrow_up</i> Show less';
        e.target.innerHTML = card.classList.contains('expanded') ? less : more;
    });

    return div;
}

function displayAnswers(index) {
    let question = questionsList[index]
    const [firstReviewer, secondReviewer] = question.reviewers;
    if (question === undefined) {
        console.log('question not found');
        question = {
            question: 'Question not found',
            answers: ['Answer not found', 'Answer not found'],
            initial_reviews: [{justification: 'Review not found'}, {justification: 'Review not found'}],
            discussions: [],
        };
    }
    document.getElementById('selected-question').innerHTML = text2Markdown('**Question:** ' + question.question); // "<strong>Question: </strong>" + formatText(question);
    // render the answers with markdown
    document.getElementById('first-model-answer').innerHTML = text2Markdown(question.answers[0]);
    document.getElementById('second-model-answer').innerHTML = text2Markdown(question.answers[1]);

    // render the initial reviews
    document.getElementById('first-reviewer-initial').innerHTML = text2Markdown(question.initial_reviews[0].justification);
    document.getElementById('second-reviewer-initial').innerHTML = text2Markdown(question.initial_reviews[1].justification);

    // set the reviewer headers
    document.getElementById('first-reviewer-header').textContent = `${modelNameMapping[firstReviewer]}: ${winMessage(question.initial_reviews[0].preference)}`;
    document.getElementById('second-reviewer-header').textContent = `${modelNameMapping[secondReviewer]}: ${winMessage(question.initial_reviews[1].preference)}`;

    // render the discussions
    discussionArea.innerHTML = '';
    question.discussions.forEach(discussion => {
        const colorClass = discussion.model === firstReviewer ? 'color-purple' : 'color-green';
        discussionArea.appendChild(makeDiscussionMessageView(discussion, colorClass));
    });

    // Update expand buttons visibility for both cards after displaying answers
    // Reset the expanded state and update expand buttons visibility for both cards after displaying answers
    document.querySelectorAll('.expandable-card').forEach(card => {
        card.classList.remove('expanded');
        updateExpandButtonVisibility(card);
        const expandBtn = card.querySelector('.expand-btn');
        expandBtn.innerHTML = '<i class="material-icons" style="pointer-events: none">keyboard_arrow_down</i> Show more';   // .textContent = 'Show more';
    });
}

document.getElementById('question-select').addEventListener('change', e => {
    currentQuestionIndex = parseInt(e.target.value);
    displayQuestion(currentQuestionIndex);
});

function switchQuestion() {
    document.getElementById('question-select').value = currentQuestionIndex;
    displayQuestion(currentQuestionIndex);
}

document.getElementById('prev-question').addEventListener('click', () => {
    // Question index starts from 1.
    currentQuestionIndex = Math.max(1, currentQuestionIndex - 1);
    switchQuestion();
});

document.getElementById('next-question').addEventListener('click', () => {
    // Question index starts from 1.
    currentQuestionIndex = Math.min(questionsCount, currentQuestionIndex + 1);
    switchQuestion();
});

function updateExpandButtonVisibility(card) {
    const cardTextContainer = card.querySelector('.card-text-container');
    const expandBtn = card.querySelector('.expand-btn');
    if (cardTextContainer.scrollHeight > cardTextContainer.offsetHeight) {
        expandBtn.style.display = 'flex';
    } else {
        expandBtn.style.display = 'none';
        card.classList.add('expanded');
    }
}

document.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        const card = e.target.closest('.expandable-card');
        card.classList.toggle('expanded');
        const more = '<i class="material-icons" style="pointer-events: none">keyboard_arrow_down</i> Show more';
        const less = '<i class="material-icons" style="pointer-events: none">keyboard_arrow_up</i> Show less';
        e.target.innerHTML = card.classList.contains('expanded') ? less : more;
    });
});
