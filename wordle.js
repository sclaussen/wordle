#!/usr/bin/env node
'use strict'
process.env.DEBUG = 'wordle';

const fs = require('fs');

const d = require('debug')('wordle');
const _ = require('lodash');
const program = require('commander');
var Set = require("collections/set");

const p = require('./lib/print').p(d);
const p4 = require('./lib/print').p4(d);
const y4 = require('./lib/print').y4(d);


wordle(process.argv);


function wordle(args) {
    let options = parseArguments(args);

    if (options.five) {
        generateAllFiveLetterWords();
        process.exit(0);
    }

    let words = getAllFiveLetterWords();
    let scoredLetters = scoreLetters(words, options);
    p4(scoredLetters);
    process.exit(1);

    if (options.letter) {
        options.green = options.letter + '....';
        console.log('Position 1: ' + getMatchingWords(words, scoredLetters, options).length);
        options.green = '.' + options.letter + '...';
        console.log('Position 2: ' + getMatchingWords(words, scoredLetters, options).length);
        options.green = '..' + options.letter + '..';
        console.log('Position 3: ' + getMatchingWords(words, scoredLetters, options).length);
        options.green = '...' + options.letter + '.';
        console.log('Position 4: ' + getMatchingWords(words, scoredLetters, options).length);
        options.green = '....' + options.letter;
        console.log('Position 5: ' + getMatchingWords(words, scoredLetters, options).length);
        process.exit(0);
    }

    let matchingWords = getMatchingWords(words, scoredLetters, options);

    if (options.scoreWord) {
        let score = scoreWord(options.scoreWordValue, matchingWords, options);
        p('Score', score);
    } else if (options.score) {
        let sortedMatchingWords = scoreWords(matchingWords, options);
        p(sortedMatchingWords);
    } else {
        p(matchingWords);
    }
    p('Vowels', scoredLetters.vowels.join(' '));
    p('Consonants', scoredLetters.consonants.join(' '));
    p(matchingWords.length);
}


function scoreLetters(words, options) {
    let scoredLetters = [];
    for (let i = 0; i < 26; i++) {
        scoredLetters.push({ name: (i + 10).toString(36), count: 0 });
    }

    for (let word of words) {
        for (let ch of word) {
            let scoredLetter = _.find(scoredLetters, { 'name': ch });
            scoredLetter.count++;
        }
    }

    let scoredConsonants = [];
    let scoredVowels = [];
    let sortedScoredLetters = _.reverse(_.sortBy(scoredLetters, 'count'));
    for (let letter of sortedScoredLetters) {
        if (isVowel(letter.name)) {
            scoredVowels.push(letter.name);
        } else {
            scoredConsonants.push(letter.name);
        }
    }

    return {
        vowels: scoredVowels.filter(item => !new Set(options.exclude).has(item)).slice(0, options.vowelCount),
        consonants: scoredConsonants.filter(item => !new Set(options.exclude).has(item)).slice(0, options.consonantCount)
    }
}


function scoreWords(words, options) {
    let scoredWords = [];

    for (let guess of words) {

        let duplicateLetters = false;
        let map = {};
        for (let i = 0; i < 5; i++) {
            map[guess[i]] = true;
        }
        if (_.keys(map).length !== 5) {
            scoredWords.push({ name: guess, score: 0 });
            continue;
        }

        let score = scoreWord(guess, words, options);
        scoredWords.push({ name: guess, score: score });
    }

    let sortedScoredWords = _.reverse(_.sortBy(scoredWords, 'score'));
    // return _.map(sortedScoredWords, (scoredWord) => {
    //     return scoredWord.name + ' (' + scoredWord.score + ')'
    // }).slice(0, 50).join('\n');
    return _.map(sortedScoredWords, 'name').slice(0, 300).join(' ');
}


function scoreWord(guess, words, options) {
    let score = 0;
    for (let solution of words) {
        if (guess === solution) {
            continue;
        }

        let guessList = [];
        let solutionList = [];
        // console.log(guess)
        // console.log(solution);
        for (let i = 0; i < 5; i++) {
            if (options.green[i] !== '.') {
                guessList.push('.');
                solutionList.push('.');
                continue;
            }
            if (guess[i] === solution[i]) {
                // console.log(' +3 (' + guess[i] + ')');
                score += 3;
                guessList.push('.');
                solutionList.push('.');
                continue;
            }
            guessList.push(guess[i]);
            solutionList.push(solution[i]);
        }

        // p(guessList);
        // p(solutionList);
        // p(score);
        for (let i = 0; i < 5; i++) {
            if (guessList[i] === '.') {
                continue;
            }
            for (let j = 0; j < 5; j++) {
                if (solutionList[j] === '.') {
                    continue;
                }
                if (guessList[i] === solutionList[j]) {
                    score++;
                    // console.log(' +1 (' + guess[i] + ')');
                    guessList[i] = '.';
                    solutionList[j] = '.';
                    break;
                }
            }
        }
        // p(guessList);
        // p(solutionList);
        // p('Total', score);
        // console.log();
    }

    return score;
}


function getMatchingWords(words, scored, options) {
    let matchingWords = [];

    _.each(words, (word) => {
        if (word.length === 0) {
            return;
        }

        let vowelCount = 0;
        for (let i = 0; i < 5; i++) {
            let ch = word[i];

            // If options.green[i] === '.' that means that there's no
            // precise match (green) at position i.  In that case, if
            // the spot contains a character in the scored.vowels set
            // or the scored.consonants set it matches the criteria,
            // otherwise the word does not match.
            if (options.green[i] === '.') {
                if (!scored.vowels.includes(ch) && !scored.consonants.includes(ch)) {
                    // p(scored.vowels.includes(ch));
                    // p('  ' + ch + ' not in vowels or consonants');
                    // p('Vowels', scored.vowels.join(' '));
                    // p('Consonants', scored.consonants.join(' '));
                    return;
                }

                if (scored.vowels.includes(ch)) {
                    vowelCount++;
                    if (vowelCount > options.vowelMaximum) {
                        return;
                    }
                }

                // Character was in scored.vowels or scored.consonants
                // and didn't exceed the vowel maximum.
                continue;
            }


            // If green[i] === 'V' then the spot matches any vowel
            // that is not in the excludes list of characters.
            if (options.green[i] === 'V') {
                if (!isVowel(ch) || options.exclude.includes(ch)) {
                    return;
                }
                continue;
            }


            // Last option is green[i] !== 'V' or '.' which means a
            // perfect match is required at the position.
            if (options.green[i] !== ch) {
                return;
            }
            continue;
        }

        for (let obj of options.yellow) {
            if (!word.includes(obj.letter)) {
                return;
            }

            for (let constraint of obj.constraints) {
                if (word[constraint - 1] === obj.letter) {
                    return;
                }
            }
        }

        matchingWords.push(word);
    });

    return matchingWords;
}


function isVowel(ch) {
    switch (ch) {
    case 'a':
    case 'e':
    case 'i':
    case 'o':
    case 'u':
        return true;
    }
    return false;
}


function isConsonant(ch) {
    return !isVowel(ch);
}


function generateAllFiveLetterWords() {
    const allWords = fs.readFileSync('./words.txt', { encoding: 'utf8', flag: 'r' });

    let words = [];
    allWords.split(/\r?\n/).forEach(word => {
        if (word.length !== 5) {
            return;
        }

        word = word.toLowerCase();
        for (let ch of word) {
            if (ch < 'a' || ch > 'z') {
                return;
            }
        }

        fs.appendFileSync("words5.txt", word + '\n');
    });

    console.log("Successfully created words5.txt");
}


function getAllFiveLetterWords() {
    const allWords = fs.readFileSync('./words-guesses.txt', { encoding: 'utf8', flag: 'r' });
    return allWords.split(/\r?\n/);
}


function parseArguments(args) {

    program
        .option('-g, --green <green>', 'Letters in the precise order (eg tr..., .tr.., ..e..) (NOTE: ending dots can be excluded)', '.....')
        .option('-y, --yellow <yellow>', 'Letters that must be in the word followed by positions the letter cannot be in (eg "a1 b c3")')
        .option('-x, --exclude <exclude>', 'Letters that cannot be in the word', '')
        .option('-c, --consonant-count <consonant-count>', 'Use the top N most popular consonants only (range 0 to 21)', 21)
        .option('-v, --vowel-count <vowel-count>', 'Use the top N popular vowels only (range 0 to 5)', 5)
        .option('-V, --vowel-maximum <vowel-maximum>', 'Maximum number of vowels in the word', 5)
        .option('-s, --score', 'Score the words', true)
        .option('-1, --first', 'First guess (-v 4, -c 5, -V 2)', false)
        .option('-5, --five', 'Generate words5.txt from words.txt (starting with 466K word dictionary)')
        .option('-L, --letter <letter>', 'Analyze the locations of a letter')
        .option('-S, --score-word <score-word>')
        .addHelpText('after', `

Find a word that begins with tr
$ wordle -g tr

Find a word that contains the letters a and b
$ wordle -y ab

Find a word that contains the letters a not in position 1 and b not in position 1 or 3
$ wordle -y a1b13

Find a word that ends in 'or' but does not contain the letters 'ae'
$ wordle -g ...or -x ae
`)
        .parse(args);

    let options = program.opts();

    if (options.scoreWord) {
        options.scoreWordValue = options.scoreWord;
        options.scoreWord = true;
    }

    if (options.first) {
        options.vowelCount = 5;
        options.consonantCount = 12;
        options.vowelMaximum = 2;
    }

    if (options.green) {
        options.green = options.green.split('');
        for (let i = options.green.length; i < 5; i++) {
            options.green.push('.');
        }
    }

    if (options.yellow) {
        let list = [];
        let object;
        for (let i = 0; i < options.yellow.length; i++) {
            let ch = options.yellow[i];
            if (ch.match(/[a-z]/)) {
                object = {
                    letter: ch,
                    constraints: []
                }
                list.push(object);
            } else if (ch.match(/[1-5]/)) {
                object.constraints.push(parseInt(ch));
            } else if (ch === ' ') {
                continue;
            } else {
                err('-y --yellow must contain a list of characters followed optionally by numeric positions, found ' + ch);
            }
        }
        options.yellow = list;
    } else {
        options.yellow = [];
    }

    if (options.exclude || options.exclude === '') {
        options.exclude = options.exclude.split('');
    }

    if (options.consonantCount < 0 || options.consonantCount > 21) {
        err('-c --consonant-count must be between 0 and 21 inclusive, value was: ' + options.consonantCount);
    }

    if (options.vowelCount < 0 || options.vowelCount > 5) {
        err('-v --vowel-count must be between 0 and 5 inclusive, value was: ' + options.vowelCount);
    }

    // p4(options);
    return options;
}


function err(s) {
    console.error('Error: ' + s);
    process.exit(1);
}
