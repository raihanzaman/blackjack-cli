import { readFile, writeFile } from 'fs/promises';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const userPath = path.join(__dirname, 'user.json');
const deckPath = path.join(__dirname, 'deck.json');

let user = { money: 1000 };
let originalDeck = [];
let deck = [];

function getCardValue(card) {
  const rank = card.slice(0, -1);
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  if (rank === 'A') return 11;
  return parseInt(rank);
}

function calculateHandValue(hand) {
  let value = hand.reduce((sum, card) => sum + getCardValue(card), 0);
  let aces = hand.filter(card => card.startsWith('A')).length;
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function printHand(name, hand) {
  console.log(`${name}'s hand: ${hand.join(', ')} (Value: ${calculateHandValue(hand)})`);
}

function shuffleDeck() {
  deck = [...originalDeck];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function dealCard() {
  if (deck.length === 0) shuffleDeck();
  return deck.pop();
}

function askQuestion(questionText) {
  return new Promise(resolve => {
    rl.question(questionText, answer => resolve(answer));
  });
}

async function getValidBet() {
  while (true) {
    const betInput = await askQuestion(`Enter your bet (Available: $${user.money}): `);
    const bet = parseInt(betInput, 10);
    if (!isNaN(bet) && bet > 0 && bet <= user.money) {
      return bet;
    }
    console.log('Invalid bet. Try again.');
  }
}

async function playRound() {
  shuffleDeck();

  const bet = await getValidBet();

  const playerHand = [dealCard(), dealCard()];
  const dealerHand = [dealCard(), dealCard()];

  printHand('Your', playerHand);
  console.log(`Dealer shows: ${dealerHand[0]}`);

  while (calculateHandValue(playerHand) < 21) {
    const move = (await askQuestion('Hit or stand? (h/s): ')).toLowerCase();
    if (move === 'h') {
      playerHand.push(dealCard());
      printHand('Your', playerHand);
    } else {
      break;
    }
  }

  const playerValue = calculateHandValue(playerHand);
  if (playerValue > 21) {
    console.log('BUST!');
    user.money -= bet;
  } else {
    while (calculateHandValue(dealerHand) < 17) {
      dealerHand.push(dealCard());
    }

    printHand('Dealer', dealerHand);
    const dealerValue = calculateHandValue(dealerHand);

    if (dealerValue > 21 || playerValue > dealerValue) {
      console.log('WIN');
      user.money += bet;
    } else if (playerValue < dealerValue) {
      console.log('LOSE!');
      user.money -= bet;
    } else {
      console.log('PUSH!');
    }
  }
  shuffleDeck();
  await writeFile(userPath, JSON.stringify(user, null, 2));
}

async function main() {
  try {
    const userData = await readFile(userPath, 'utf-8');
    user = JSON.parse(userData);
  } catch {
    await writeFile(userPath, JSON.stringify(user, null, 2));
  }

  try {
    const deckData = await readFile(deckPath, 'utf-8');
    originalDeck = JSON.parse(deckData);
    deck = [...originalDeck];
  } catch {
    console.error('Missing or invalid deck.json.');
    process.exit(1);
  }

  while (user.money > 0) {
    await playRound();
    const again = (await askQuestion('Play another round? (y/n): ')).toLowerCase();
    if (again !== 'y') break;
  } 

  console.log(`Game over. You finished with $${user.money}`);
  rl.close();
}

main();