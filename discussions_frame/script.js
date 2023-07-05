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
        option.textContent = 'Q' + index.toString() + ': ' + question[0].question;
        select.appendChild(option);
    });
    // Populate the question select.
    // category = questionMapping[question_id].category;
    // categoryMapping[category].forEach(question_id => {
    //     const question = questionMapping[question_id];
    //     const option = document.createElement('option');
    //     option.value = question_id;
    //     option.textContent = 'Q' + question_id.toString() + ': ' + question.question;
    //     select.appendChild(option);
    // });
    select.value = question_id;
}

function updateModelSelect() {
    // const first_select = document.getElementById('first-model-select');
    // const second_select = document.getElementById('second-model-select');
    // document.getElementById('first-model-figure').src = modelFigureMapping[first_select.value];
    // document.getElementById('second-model-figure').src = modelFigureMapping[second_select.value];
}

function populateModels(models) {
    const first_select = document.getElementById('first-reviewer-select');
    const second_select = document.getElementById('second-reviewer-select');
    models.forEach(model => {
        const option = document.createElement('option');
        option.value = model;
        option.textContent = modelNameMapping[model];
        first_select.appendChild(option);
        second_select.appendChild(option.cloneNode(true));
    });
    updateModelSelect();
}

function populateQuestions(questions) {
    const category_select = document.getElementById('category-select');

    let index = 0;
    questionsCount = questions.length;
    questions.forEach(question => {
        index++;
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
                return response;
            });
        }

        if (questionsList[index] === undefined) {
            questionsList[index] = [];
        }

        questionsList[index].push({
            question: q,
            answers: [question.answer_a, question.answer_b],
            reviewers: [modelA, modelB],
            initial_reviews: [ reviewA, reviewB ],
            discussions: formatDiscussion(question[`${modelA}_${modelB}_discussion`]),
        });

        questionsList[index].push({
            question: q,
            answers: [question.answer_a, question.answer_b],
            reviewers: [modelB, modelA],
            initial_reviews: [ reviewB, reviewA ],
            discussions: formatDiscussion(question[`${modelB}_${modelA}_discussion`]),
        })

        // const option = document.createElement('option');
        // Store the question id in the category mapping.
        // if (question.category in categoryMapping) {
        //     categoryMapping[question.category].push(question.id);
        // } else {
        //     categoryMapping[question.category] = [question.id];
        //     const category_option = document.createElement('option');
        //     category_option.value = question.category;
        //     category_option.textContent = capitalizeFirstChar(question.category);
        //     category_select.appendChild(category_option);
        // }
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
    div.className = "card expandable-card";
    div.innerHTML = `
        <div class="card-header ${colorClass}" >${modelNameMapping[model]}: ${betterModelMessage}</div>
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
    const firstReviewer = document.getElementById('first-reviewer-select').value;
    const secondReviewer = document.getElementById('second-reviewer-select').value;
    let question = questionsList[index].filter(q => q.reviewers[0] === firstReviewer && q.reviewers[1] === secondReviewer)[0];
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

    // Display evaluation
    // score_text = modelNameMapping[firstModel] + " " + score[0] + "/10, " + secondModel + " " + score[1] + "/10";
    // document.getElementById('evaluation-header').textContent = "GPT-4 Evaluation" + " (Score: " + score_text + ")";
    // document.getElementById('evaluation-result').innerHTML = text2Markdown(question.evaluations[firstModel]);

    // Update model names
    let assistant1_title = "Assistant #1";
    let assistant2_title = "Assistant #2";
    // // Update scores/labels.
    // let assistant1_score_label = score[0].toString() + '/10';
    // let assistant2_score_label = score[1].toString() + '/10';

    // Update the winner.
/*
    if (score[0] == score[1]) {
        assistant1_title = '🏆 ' + assistant1_title;
        assistant1_score_label = '🏆 ' + assistant1_score_label;
        assistant2_title = '🏆 ' + assistant2_title;
        assistant2_score_label = '🏆 ' + assistant2_score_label;
        firstModelHeaderColor = colorYellow;
        secondModelHeaderColor = colorYellow;
    } else if (score[0] > score[1]) {
        assistant1_title = '🏆 ' + assistant1_title;
        assistant1_score_label = '🏆 ' + assistant1_score_label;
        firstModelHeaderColor = colorBlue;
        secondModelHeaderColor = colorRed;
    } else if (score[0] < score[1]) {
        assistant2_title = '🏆 ' + assistant2_title;
        assistant2_score_label = '🏆 ' + assistant2_score_label;
        firstModelHeaderColor = colorRed;
        secondModelHeaderColor = colorBlue;
    }
*/


    // document.getElementById('first-model-header').textContent = assistant1_title;
    // document.getElementById('second-model-header').textContent = assistant2_title;

    // document.getElementById('first-score-label').textContent = assistant1_score_label;
    // document.getElementById('second-score-label').textContent = assistant2_score_label;

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

// document.getElementById('category-select').addEventListener('change', e => {
//     let currentCategory = e.target.value;
//     const questionIds = categoryMapping[currentCategory];
//     currentQuestionIndex = questionIds[0];
//     updateQuestionSelect(currentQuestionIndex);
//     displayQuestion(currentQuestionIndex);
// });

// Update expand buttons whenever the model is changed
document.getElementById('first-reviewer-select').addEventListener('change', () => {
    displayAnswers(currentQuestionIndex);
    document.querySelectorAll('.expandable-card').forEach(card => {
        updateExpandButtonVisibility(card);
    });
    updateModelSelect();
});
document.getElementById('second-reviewer-select').addEventListener('change', () => {
    displayAnswers(currentQuestionIndex);
    document.querySelectorAll('.expandable-card').forEach(card => {
        updateExpandButtonVisibility(card);
    });
    updateModelSelect();
});

function switchQuestionAndCategory() {
    document.getElementById('question-select').value = currentQuestionIndex;
    // old_category = document.getElementById('category-select').value;
    // new_category = questionsList[currentQuestionIndex].category;
    // if (old_category != new_category) {
    //     document.getElementById('category-select').value = new_category;
    //     updateQuestionSelect(currentQuestionIndex);
    // }
    displayQuestion(currentQuestionIndex);
}

document.getElementById('prev-question').addEventListener('click', () => {
    // Question index starts from 1.
    currentQuestionIndex = Math.max(1, currentQuestionIndex - 1);
    switchQuestionAndCategory();
});

document.getElementById('next-question').addEventListener('click', () => {
    // Question index starts from 1.
    currentQuestionIndex = Math.min(questionsCount, currentQuestionIndex + 1);
    switchQuestionAndCategory();
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
