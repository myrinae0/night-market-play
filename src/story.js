// The story: a short scene at the counter before each level, plus the dialogue
// state machine and the story save (pure; no DOM). The same script is written
// out for reading in STORY.md.
//
// A scene is a list of steps:
// A scene may name a spirit `waiting` far off at the end of the line (Eoreum).
//   { who, text }                       a line ('YOU', 'STORY' or a spirit id)
//   { who, text, if: flag }             only when the flag is set (unless: not set)
//   { choice: [{ text, reply: [steps], effect: { rel: n, flag, who, ending }, if }] }
//     (`who`: whose relationship moves, default the scene's spirit; `ending`:
//     the finale's ending; an option with `if` only shows when that flag is set)
// Choices never block: every option leads on, and Skip is always there.
import { SPIRITS, memoryText } from './spirits.js';

export const SCENES = [
  {
    id: 'l1', level: 1, spirit: 'lantern', title: 'The first light',
    steps: [
      { who: 'STORY', text: 'Grandma left you her stall. Dust on the counter. Chimaek will not stop staring at the empty street.' },
      { who: 'STORY', text: 'Then the lanterns flicker, one by one, and the street is not empty anymore.' },
      { who: 'lantern', text: 'Mmm... the light is on. I thought I was dreaming.' },
      { who: 'lantern', text: 'You have her eyes. The old cook. Is she...?' },
      {
        choice: [
          { text: 'She passed in the spring.', effect: { rel: 1, flag: 'deung_told' },
            reply: [{ who: 'lantern', text: 'Ah. Then the light is yours to keep now. She promised it would never go out.' }] },
          { text: 'Who are you?', effect: { rel: 0 },
            reply: [{ who: 'lantern', text: 'Just a lantern who stays up too late. She kept a light on for me. Every night.' }] },
          { text: 'We are open! What can I get you?', effect: { rel: 1, flag: 'deung_business' },
            reply: [{ who: 'lantern', text: 'Ha! Straight to business. Just like her.' }] },
        ],
      },
      { who: 'lantern', text: 'Something cold and fizzy, please. From the cooler.' },
      { who: 'lantern', text: 'My friends saw the light too. They will be hungry.' },
    ],
  },
  {
    id: 'l2', level: 2, spirit: 'fox', title: 'The slipping mask',
    steps: [
      { who: 'STORY', text: 'A fox in a white mask leans on the counter. The mask keeps slipping.' },
      { who: 'fox', text: 'So. The grill is warm again. Do you know how she grilled galbi?' },
      { who: 'fox', text: 'One side, then flip, then the other. Never in a hurry.' },
      {
        choice: [
          { text: 'Can I see your face?', effect: { rel: -1, flag: 'yeo_asked' },
            reply: [{ who: 'fox', text: 'She promised never to ask. Breaking her promises already?' }] },
          { text: 'One side, then the other. Got it.', effect: { rel: 1, flag: 'yeo_hum' },
            reply: [{ who: 'fox', text: 'Good. She hummed while she flipped. I liked the humming.' }] },
        ],
      },
      { who: 'fox', text: 'Your dog does not like me. That is fair. I used to steal her sausages.' },
      { who: 'STORY', text: 'Chimaek growls. Very softly.' },
    ],
  },
  {
    id: 'l3', level: 3, spirit: 'moss', title: 'Old coins',
    steps: [
      { who: 'STORY', text: 'Something big and green shuffles up. Mossy stones, and a small white flower on top.' },
      { who: 'moss', text: '...Hello. ...I am slow. ...Sorry.' },
      { who: 'moss', text: '...She saved me the first drumstick. ...Every batch. ...Batter, then oil, then gold.' },
      {
        choice: [
          { text: 'The first one is yours. Promise.', effect: { rel: 1, flag: 'ikki_promise' },
            reply: [{ who: 'moss', text: '...Thank you. ...I will pay. ...I always pay.' }] },
          { text: 'Can you pay for it?', effect: { rel: 0, flag: 'ikki_coins' },
            reply: [{ who: 'STORY', text: 'Old coins rattle out of the moss.' }, { who: 'moss', text: '...These were good when she was young. ...Still good?' }] },
        ],
      },
      { who: 'moss', text: '...Your dog keeps looking under the counter. ...She is guarding something.' },
      { who: 'moss', text: '...Good dog.' },
    ],
  },
  {
    id: 'l4', level: 4, spirit: 'frog', title: 'The wok song',
    steps: [
      { who: 'STORY', text: 'Rain on the awning. A round blue frog with a paper boat on its head hops onto the counter.' },
      { who: 'frog', text: 'Ribbit! The wok! You found the wok! She promised to teach me the wok song.' },
      { who: 'frog', text: 'Toss... and land. Toss... and land. Too fast and it all goes on the floor!' },
      {
        choice: [
          { text: 'Then you teach me.', effect: { rel: 1, flag: 'frog_teacher' },
            reply: [{ who: 'frog', text: 'Me? Teach? Oh! Oh, I will try! Flick up... and wait for it to land!' }] },
          { text: 'Why the paper boat?', effect: { rel: 0, flag: 'frog_river' },
            reply: [{ who: 'frog', text: 'For the rain! She folded it the winter the river froze. The winter her hands got too cold to cook.' }] },
        ],
      },
      { who: 'frog', text: 'And if you stop tossing, it burns. She never stopped. Not once.' },
      { who: 'STORY', text: 'Chimaek has hidden behind the counter. Only her ears show.' },
    ],
  },
  {
    id: 'l5', level: 5, spirit: 'moth', title: 'A letter, unsent',
    steps: [
      { who: 'STORY', text: 'A soft grey moth lands on the cooler. A postbag hangs from one wing.' },
      { who: 'moth', text: 'Post! Well. Almost post. This letter is thirty years late and a little chewed.' },
      { who: 'moth', text: 'She wrote it, but never said where to take it. Only: give it to whoever comes back.' },
      {
        choice: [
          { text: 'Read it to me.', effect: { rel: 1, flag: 'letter_read' },
            reply: [
              { who: 'moth', text: 'Ahem. Buy a fourth grill spot. The tray is too small. Feed the fox less.' },
              { who: 'moth', text: 'The last line is smudged. Something about a bell.' },
            ] },
          { text: 'Keep it for now.', effect: { rel: 1, flag: 'letter_kept' },
            reply: [{ who: 'moth', text: 'A patient one! Some letters wait for the right night.' }] },
        ],
      },
      { who: 'moth', text: 'Tonight everyone wants everything. Start the slow food first!' },
      { who: 'STORY', text: 'After closing, you can spend your coins on the stall.' },
    ],
  },
  {
    id: 'l6', level: 6, spirit: 'crane', title: 'The long line',
    steps: [
      { who: 'STORY', text: 'A paper crane unfolds itself on the counter. There is writing on its wings. Grandma wrote it.' },
      { who: 'crane', text: 'I was a recipe once. Her last page. Steamed buns. She never finished it.' },
      { who: 'crane', text: 'Do you see them? The line. Everyone heard the stall is open.' },
      {
        choice: [
          { text: 'Why did she close the stall?', effect: { rel: 1, flag: 'bell_known' },
            reply: [
              { who: 'crane', text: 'Her hands got too cold for the wok, and she could not ring the bell anymore.' },
              { who: 'crane', text: 'So she asked the dog to keep it safe. Until someone came back.' },
            ] },
          { text: 'Feed them first. Talk later.', effect: { rel: 1, flag: 'supper_first' },
            reply: [{ who: 'crane', text: 'Yes. Stories after supper. That was her rule too.' }] },
        ],
      },
      { who: 'crane', text: 'Serve whoever is ready. Nobody minds the order, as long as nobody leaves hungry.' },
      { who: 'STORY', text: 'Chimaek growls at the crane. Under the counter, something small and brass rings once. By itself.' },
    ],
  },
  // ---------- part 2 ----------
  {
    id: 'l7', level: 7, spirit: 'wisp', title: 'Steam rising',
    steps: [
      { who: 'STORY', text: 'The old steamer was under the counter, behind Chimaek. She let you take it. Just this once.' },
      { who: 'STORY', text: 'When the water heats, the steam does not rise. It curls up on the counter and looks at you.' },
      { who: 'wisp', text: '...Hello. ...You lit the fire under me.' },
      { who: 'wisp', text: '...I was the steam from her last batch of buns. ...The night she closed. ...I never went up.' },
      {
        choice: [
          { text: 'Why did you stay?', effect: { rel: 1, flag: 'gim_why' },
            reply: [{ who: 'wisp', text: '...She said someone would come back. ...I wanted to see who.' }, { who: 'wisp', text: '...It is you. ...I think.' }] },
          { text: 'You can sleep in the basket.', effect: { rel: 1, flag: 'gim_stay' },
            reply: [{ who: 'wisp', text: '...Really? ...It is warm in there. ...She let me too.' }] },
          { text: 'Who were the buns for?', effect: { rel: 0, flag: 'gim_winter' },
            reply: [{ who: 'wisp', text: '...For someone in the long winter. ...Someone who waited by the river.' }] },
        ],
      },
      { who: 'wisp', text: '...Lid on, or the steam runs away. ...Like me.' },
      { who: 'STORY', text: 'Inside the bamboo lid, grandma wrote three words: FOR THE LONG WINTER.' },
    ],
  },
  {
    id: 'l8', level: 8, spirit: 'fox', title: 'Old regulars',
    steps: [
      { who: 'STORY', text: 'The fox is back, with a sack over one shoulder. The mask sits straight tonight.' },
      { who: 'fox', if: 'yeo_hum', text: 'You hummed last time. Badly. I liked it.' },
      { who: 'fox', unless: 'yeo_hum', text: 'You again. Still curious about my face?' },
      { who: 'fox', text: 'Forty sausages. I said I would pay her back. Here. Forty coins.' },
      { who: 'STORY', text: 'The coins are old. Each one has a little bell stamped on it.' },
      { who: 'fox', text: 'The bell made this market. Ring it and the street remembers itself.' },
      {
        choice: [
          { text: 'Then why did she stop ringing it?', effect: { rel: 1, flag: 'bell_why' },
            reply: [{ who: 'fox', text: 'Her hands, they say. Cold hands.' }, { who: 'fox', text: 'Hmph. A cold hand can still ring a bell. She chose not to.' }] },
          { text: 'Keep your coins. You paid enough.', effect: { rel: 1, flag: 'yeo_debt' },
            reply: [{ who: 'fox', text: '...She said the same thing. Every time.' }, { who: 'fox', text: 'Fine. I will eat them off instead.' }] },
        ],
      },
      { who: 'fox', text: 'The regulars are coming back. They remember how they were treated. So do I.' },
      { who: 'STORY', text: 'Chimaek growls. Then, for the first time, she lets the fox scratch her ear.' },
    ],
  },
  {
    id: 'l9', level: 9, spirit: 'lantern', title: 'Good dog',
    steps: [
      { who: 'STORY', text: 'Deung floats in early, and glows a little brighter when it sees Chimaek.' },
      { who: 'lantern', if: 'deung_told', text: 'You told me about her, that first night. So I will tell you about the dog.' },
      { who: 'lantern', unless: 'deung_told', text: 'You never said where she went. I will tell you about the dog anyway.' },
      { who: 'lantern', text: 'She has not changed. Not one whisker. Do you know how long I have known this dog?' },
      {
        choice: [
          { text: 'How long?', effect: { rel: 1, flag: 'dog_age' },
            reply: [{ who: 'lantern', text: 'Since the first night of the market. Longer than your grandma.' }, { who: 'lantern', text: 'Dogs do not live that long. Do they?' }] },
          { text: 'She is a good dog.', effect: { rel: 1, flag: 'dog_good' },
            reply: [{ who: 'lantern', text: 'The best. She has guarded that counter every night. Even the dark ones.' }] },
        ],
      },
      { who: 'lantern', text: 'Your grandma never fed her from the pan. No sauce, no onion, no burnt bits.' },
      { who: 'lantern', text: 'Just plain meat off the grill, now and then. She wagged so hard the lanterns shook.' },
      { who: 'STORY', text: 'Chimaek looks at the grill. Then at you. Then at the grill.' },
    ],
  },
  {
    id: 'l10', level: 10, spirit: 'clay', title: 'Boiling point',
    steps: [
      { who: 'STORY', text: 'The noodle pot sits on the back burner. It has a face. It is frowning at you.' },
      { who: 'clay', text: 'Hmph. Took you long enough. Water. In me. Now.' },
      { who: 'clay', text: 'Boil first. Noodles after. Never before. Mushy noodles are an insult.' },
      { who: 'clay', if: 'gim_stay', text: 'And tell that wisp to stop sleeping in the steamer. It fogs up my lid.' },
      {
        choice: [
          { text: 'Thank you for waiting.', effect: { rel: 1, flag: 'ttuk_thanks' },
            reply: [{ who: 'clay', text: '...Hmph. Thank you. Hmph. Nobody says that to a pot.' }] },
          { text: 'Who put a face on a pot?', effect: { rel: -1, flag: 'ttuk_face' },
            reply: [{ who: 'clay', text: 'Who put a face on YOU? Rude.' }] },
        ],
      },
      { who: 'clay', text: 'The night she closed, she put out my fire herself. Then she went down to the river.' },
      { who: 'clay', text: 'She came back without her scarf. And with very cold hands.' },
      { who: 'STORY', text: 'Chimaek stares at the pot. The pot stares back. Neither one blinks.' },
    ],
  },
  {
    id: 'l11', level: 11, spirit: 'moth', title: 'Specials board',
    steps: [
      { who: 'STORY', text: 'The moth is back, out of breath, with a second letter in its bag.' },
      { who: 'moth', text: 'Post! A real one this time. The ink is still wet. Well. Damp.' },
      { who: 'moth', if: 'letter_read', text: 'You heard the first one. This is the one I said was not ready.' },
      { who: 'moth', unless: 'letter_read', text: 'You kept the first one. Patient. This one would not wait.' },
      {
        choice: [
          { text: 'Read it to me.', effect: { rel: 1, flag: 'letter2_read' },
            reply: [
              { who: 'moth', text: 'Ahem. One special a night. Make it the best thing you cook.' },
              { who: 'moth', text: 'And if the bell rings by itself, do not be afraid. It means someone is coming home.' },
            ] },
          { text: 'Who sent it?', effect: { rel: 0, flag: 'letter2_who' },
            reply: [
              { who: 'moth', text: 'Her. Written before she closed. Posted after. Do not ask me how. Post is post.' },
              { who: 'moth', text: 'It says: one special a night. And when the bell rings by itself, someone is coming home.' },
            ] },
        ],
      },
      { who: 'moth', text: 'The specials board is behind the cooler. Tonight one dish pays double.' },
      { who: 'STORY', text: 'Under the counter, the bell hums. Very quietly. Chimaek puts her paw on it.' },
    ],
  },
  {
    id: 'l12', level: 12, spirit: 'frog', title: 'Rain and rush',
    steps: [
      { who: 'STORY', text: 'Rain again. The frog hops in, soaked, and the street fills up behind it.' },
      { who: 'frog', text: 'Ribbit! Everyone is coming in out of the rain! Quick snacks, quick drinks, quick quick!' },
      { who: 'frog', if: 'frog_teacher', text: 'And my student is still here! Toss and land, remember?' },
      { who: 'frog', text: 'Rain is easy. Rain is a river falling. It is ice I am scared of.' },
      {
        choice: [
          { text: 'What happened at the river?', effect: { rel: 1, flag: 'river_told' },
            reply: [
              { who: 'frog', text: 'The river froze all the way down. Something came up through the ice. Something cold and very hungry.' },
              { who: 'frog', text: 'She fed it. Every night, all winter. Her hands were warm when she went. Not when she came back.' },
            ] },
          { text: 'Then stay here where it is warm.', effect: { rel: 1, flag: 'frog_stay' },
            reply: [
              { who: 'frog', text: 'Under the awning? With the dog? ...Alright. If she does not mind.' },
              { who: 'STORY', text: 'Chimaek does mind. She stays hidden anyway.' },
            ] },
        ],
      },
      { who: 'frog', text: 'When the crowd rushes in, drinks and snacks first! The slow food can wait a little.' },
      { who: 'STORY', text: 'Chimaek has hidden behind the counter again. Only her ears show.' },
    ],
  },
  {
    id: 'l13', level: 13, spirit: 'rabbit', title: 'Lantern festival',
    steps: [
      { who: 'STORY', text: 'Every lantern on the street is lit tonight. Even the broken ones. The moon is full and very close.' },
      { who: 'rabbit', text: 'So. The stall is open, the bell is humming, and the dog is well fed. Good.' },
      { who: 'rabbit', text: 'I am Dal. I pound the rice cakes on the moon. Once a year I come down for the festival.' },
      { who: 'rabbit', text: 'Long ago I gave your grandma a bell, a dog and a promise to keep. She kept them all. Almost.' },
      { who: 'rabbit', if: 'bell_known', text: 'The crane told you the bell opens the market. It also tells everyone where the market is.' },
      {
        choice: [
          { text: 'What promise?', effect: { rel: 1, flag: 'dal_promise' },
            reply: [
              { who: 'rabbit', text: 'That the market would never let anyone go hungry. Not even the ones who come in winter.' },
              { who: 'rabbit', text: 'That is all I can say tonight. The rest is hers to tell, not mine.' },
            ] },
          { text: 'What is a keeper?', effect: { rel: 1, flag: 'dal_keeper' },
            reply: [
              { who: 'rabbit', text: 'The one who rings the bell. The one the street listens to.' },
              { who: 'rabbit', text: 'She was the keeper. Now there is none. Or there is one who does not know it yet.' },
            ] },
          { text: 'Why a dog?', effect: { rel: 0, flag: 'dal_dog' },
            reply: [{ who: 'rabbit', text: 'Every bell needs a guard. Bells are loud. Some things that hear them should not come.' }] },
        ],
      },
      { who: 'rabbit', text: 'Tonight, VIPs. Gold tickets. They pay double, and they do not like to wait.' },
      { who: 'STORY', text: 'Under the counter, the bell rings twice. Chimaek stands up and looks toward the river.' },
    ],
  },
  // After night 13 (the first time it is cleared): the part 2 cliffhanger.
  {
    id: 'l13b', level: 13, after: true, spirit: null, dog: 'growl', frost: true, frostAt: 2, title: 'The first frost',
    steps: [
      { who: 'STORY', text: 'The festival ends. The last lantern goes out. Then the bell rings a third time.' },
      { who: 'STORY', text: 'Frost runs across the counter. The rain barrels freeze. Your breath turns white.' },
      { who: 'STORY', text: 'Chimaek barks. Deung says later she has never barked before. Not once, in all those years.' },
      { who: 'VOICE', text: 'She promised me one more bowl.' },
      { who: 'VOICE', text: 'Before the river thaws. She promised.' },
      {
        choice: [
          { text: 'She is gone.', effect: { flag: 'frost_told' },
            reply: [{ who: 'VOICE', text: 'Then the promise is yours. Keeper.' }] },
          { text: 'Who are you?', effect: { flag: 'frost_who' },
            reply: [{ who: 'VOICE', text: 'The long winter. She knew my name. Ask the dog.' }] },
        ],
      },
      { who: 'STORY', text: 'The frost melts as fast as it came. Chimaek keeps staring at the dark end of the street.' },
      { who: 'STORY', text: 'To be continued in part 3.' },
    ],
  },
  // ---------- part 3: the long winter ----------
  {
    id: 'l14', level: 14, spirit: 'lantern', waiting: 'ice', title: 'First frost',
    steps: [
      { who: 'STORY', text: 'Winter came back overnight. Frost on the counter, ice in the rain barrels, snow on every awning.' },
      { who: 'STORY', text: 'The lanterns light themselves anyway. The line forms. At the very end of it, something waits that does not move.' },
      { who: 'lantern', text: 'Brr. Even ghosts feel this one. Your food will not stay hot for long tonight.' },
      { who: 'lantern', text: 'And do not stare at the end of the line. It is rude. Chimaek is staring enough for both of you.' },
      { who: 'STORY', text: 'A carp of clear ice floats there, upright and very still. It says nothing. The snow around it does not fall.' },
      {
        choice: [
          { text: 'It waits in line like everyone.', effect: { rel: 1, flag: 'ice_wait' },
            reply: [{ who: 'lantern', text: 'Ha. Yes. Nobody skips the line here. Not even the winter.' }] },
          { text: 'Who is that?', effect: { rel: 0, flag: 'ice_asked' },
            reply: [{ who: 'lantern', text: 'The cold voice from the festival, I think. I have never seen it so close.' }, { who: 'lantern', text: 'Grandma knew its name. The dog knows it too. Dogs always do.' }] },
          { text: 'Then save it something warm.', effect: { rel: 1, flag: 'ice_warm' },
            reply: [{ who: 'lantern', text: 'She always did. A steamed bun, last thing at night. I will keep the light on for it.' }] },
        ],
      },
      { who: 'lantern', text: 'Cook last, serve fast. Cold food still counts, but nobody tips much for a cold supper.' },
      { who: 'STORY', text: 'Chimaek does not growl. She sits up very straight, the way she did when grandma came home.' },
    ],
  },
  {
    id: 'l15', level: 15, spirit: 'frog', waiting: 'ice', title: 'The scarf',
    steps: [
      { who: 'STORY', text: 'Sleet on the awning. The frog hops in, shivering, dragging something stiff and red behind it.' },
      { who: 'frog', text: 'Ribbit! I went down under the ice! So cold my boat froze! But look. Look what I found.' },
      { who: 'STORY', text: 'It is the scarf grandma wore every winter. Red wool, frozen solid, still folded the way she folded it.' },
      { who: 'frog', if: 'frog_teacher', text: 'My student! I brought it for you. A teacher should bring presents.' },
      { who: 'frog', text: 'The river was holding it. Gently. Like it was keeping it for someone.' },
      {
        choice: [
          { text: 'Keep it here, by the bell.', effect: { rel: 1, flag: 'scarf_kept' },
            reply: [{ who: 'frog', text: 'By the bell. With the dog. Yes. Then she is home, a little.' }, { who: 'STORY', text: 'Chimaek puts her nose in the frozen wool and does not move for a long time.' }] },
          { text: 'Give it back to the river.', effect: { rel: 0, flag: 'scarf_returned' },
            reply: [{ who: 'frog', text: 'Back? Oh. Oh, I see. So the river is not alone. You are a strange keeper. A good one.' }] },
          { text: 'Warm it by the stove.', effect: { rel: 1, flag: 'scarf_warmed' },
            reply: [{ who: 'frog', text: 'By the stove! It will drip! It will steam! It will smell like her soup!' }, { who: 'STORY', text: 'The ice melts off it slowly, and for a moment the stall smells like her kitchen.' }] },
        ],
      },
      { who: 'frog', text: 'Who did she knit it for? It is too long for her. Long enough for something very tall.' },
      { who: 'STORY', text: 'At the end of the line, the carp of ice turns its head toward the scarf. Just a little.' },
    ],
  },
  {
    id: 'l16', level: 16, spirit: 'moth', title: 'Soup pot',
    steps: [
      { who: 'STORY', text: 'The moth arrives at a run, covered in snow, holding a letter over its head to keep it dry.' },
      { who: 'moth', text: 'Post! The third letter! The last one! I told you there would be a third.' },
      { who: 'moth', if: 'letter2_read', text: 'You read the other two. So I know you will read this one properly.' },
      { who: 'moth', unless: 'letter2_read', text: 'It is not really a letter. It is a recipe. With a letter folded inside.' },
      { who: 'STORY', text: 'Under the counter, behind Chimaek, sits an old iron pot you never noticed. She moves aside to let you take it.' },
      {
        choice: [
          { text: 'Read it to me.', effect: { rel: 1, flag: 'letter3_read' },
            reply: [
              { who: 'moth', text: 'Ahem. Tteokguk, for the river. Rice cakes cut like coins, so the new year is rich.' },
              { who: 'moth', text: 'Stir it, and do not stop. It sticks the moment you stop paying attention. So does grief.' },
            ] },
          { text: 'A recipe? For who?', effect: { rel: 0, flag: 'letter3_who' },
            reply: [
              { who: 'moth', text: 'For the river. One bowl every winter. Rice cakes like coins, broth like a warm hand.' },
              { who: 'moth', text: 'And at the bottom, very small: I am sorry I was late.' },
            ] },
        ],
      },
      { who: 'moth', text: 'She says the last bowl is the one that matters. She underlined it. Twice.' },
      { who: 'STORY', text: 'The old pot is cold. When you light the fire under it, the broth smells exactly like her.' },
    ],
  },
  {
    id: 'l17', level: 17, spirit: 'clay', title: 'Cold hands',
    steps: [
      { who: 'STORY', text: 'Ttuk is quiet tonight. There is a thin line across his belly you never noticed. A crack.' },
      { who: 'clay', text: 'Hmph. Fine. You want to know why I am grumpy? I will tell you once.' },
      { who: 'clay', text: 'The night she stopped, she put out my fire. The cold got in. By morning I had cracked.' },
      { who: 'clay', text: 'She came back from the river to cook the last bowl. In me. The broth ran out through the crack, into the snow.' },
      { who: 'clay', text: 'So the last bowl was never served. Because of me. Hmph. There. Now you know.' },
      {
        choice: [
          { text: 'You did your best.', effect: { rel: 1, flag: 'ttuk_forgiven' },
            reply: [{ who: 'clay', text: '...Hmph. Nobody says that to a pot either. Stop being kind. It is very annoying.' }] },
          { text: 'Then I will mend you.', effect: { rel: 1, flag: 'ttuk_mended' },
            reply: [{ who: 'clay', text: 'With what? Rice paste? Clay from the river?' }, { who: 'clay', text: '...Hmph. Fine. Gently. I am old.' }] },
        ],
      },
      { who: 'STORY', text: 'A white rabbit hops onto the counter, ears pink with cold. Dal, down from the moon in the middle of winter.' },
      { who: 'rabbit', text: 'Then I will tell the rest. I gave your grandma a bell, a dog and a promise. Here is the promise.' },
      { who: 'rabbit', text: 'The river has a winter in it. Eoreum. Hungry, and very alone. Every year the keeper serves it one bowl, and it lets spring come.' },
      { who: 'rabbit', if: 'dal_promise', text: 'You asked me at the festival. Nobody leaves the market hungry. Not even the winter. That is the promise.' },
      { who: 'rabbit', text: 'And the dog? I made her from the first fire of this market. An ember with a tail. She keeps the bell, and the keeper warm.' },
      { who: 'STORY', text: 'Chimaek wags once, as if to say: obviously.' },
      {
        choice: [
          { text: 'Then I will keep it.', effect: { rel: 1, who: 'rabbit', flag: 'promise_keep' },
            reply: [{ who: 'rabbit', text: 'Good. Keepers keep. The river is waiting.' }] },
          { text: 'Why did she stop?', effect: { rel: 0, who: 'rabbit', flag: 'why_stop' },
            reply: [{ who: 'rabbit', text: 'Not cold hands. Old hands. Even keepers grow old. That is why there has to be a next one.' }] },
        ],
      },
    ],
  },
  {
    id: 'l18', level: 18, spirit: 'fox', title: 'The whole market',
    steps: [
      { who: 'STORY', text: 'It snows all evening. Then the whole street turns up at once, and not one of them came to eat.' },
      { who: 'fox', text: 'Do not look so surprised. We heard. The last bowl, the river, the promise. Word gets around a market.' },
      { who: 'fox', text: 'So we help. Even me. Especially me. I owe her forty sausages and a mask.' },
      { who: 'moss', text: '...I brought coins. ...For the rice cakes. ...Old ones. ...Still good.' },
      { who: 'wisp', text: '...I will keep the tray warm. ...It is the one thing steam is good for.' },
      { who: 'crane', text: 'I found the end of my page. She wrote it the last night: and save the best bowl for last.' },
      { who: 'frog', if: 'scarf_warmed', text: 'And the scarf is dry! I checked! Twice!' },
      {
        choice: [
          { text: 'Thank you. All of you.', effect: { rel: 1, flag: 'market_thanks' },
            reply: [{ who: 'fox', text: 'Hmph. Do not get sentimental. We will all cry into the soup.' }] },
          { text: 'She would have loved this.', effect: { rel: 1, flag: 'market_grandma' },
            reply: [{ who: 'fox', text: 'She would have bossed us all around. Go on, then. Boss us.' }] },
        ],
      },
      { who: 'fox', text: 'Tonight the soup pays double. Tomorrow night, the last bowl.' },
      { who: 'STORY', text: 'Chimaek walks the whole line and sniffs every spirit in it. She growls at nobody. Not even the fox.' },
    ],
  },
  {
    id: 'l19', level: 19, spirit: 'ice', title: 'One more bowl', dog: 'stare',
    steps: [
      { who: 'STORY', text: 'The longest night of the winter. The snow stops. It is so quiet you can hear the river under the ice.' },
      { who: 'STORY', text: 'Eoreum is already in line. At the very end. It was there before the lanterns came on.' },
      { who: 'ice', text: '...You are the new keeper. ...Hello.' },
      { who: 'ice', if: 'frost_who', text: '...You asked my name, that first night. ...It is Eoreum. ...Ice. ...Not much of a name.' },
      { who: 'ice', unless: 'frost_who', text: '...My name is Eoreum. ...Ice. ...She gave it to me. ...Before her, I had none.' },
      { who: 'ice', text: '...I do not want to hurt anyone. ...I only get hungry. ...And the river gets so quiet.' },
      { who: 'ice', text: '...She fed me buns all winter, so I would not come up into the market. ...She was saving the last bowl. ...Then her hands stopped.' },
      {
        choice: [
          { text: 'Your bowl comes last tonight.', effect: { rel: 1, flag: 'ice_last' },
            reply: [{ who: 'ice', text: '...Last. ...Yes. ...The best one comes last. ...She said that too.' }] },
          { text: 'Are you cold?', effect: { rel: 1, flag: 'ice_cold' },
            reply: [{ who: 'ice', text: '...Always. ...That is what I am.' }, { who: 'ice', text: '...Near the stall, a little less.' }] },
          { text: 'Why did you wait so long?', effect: { rel: 0, flag: 'ice_why' },
            reply: [{ who: 'ice', text: '...A promise is a promise. ...I am a river. ...Rivers are patient.' }] },
        ],
      },
      { who: 'ice', text: '...Feed everyone else first. ...I will wait. ...I am good at waiting.' },
      { who: 'STORY', text: 'Chimaek leaves the counter, walks to the end of the line, and sits down next to Eoreum in the snow.' },
    ],
  },
  // After night 19 (every time it is cleared, so a replay can reach another
  // ending): the last bowl, and the finale. The ending is the answer picked;
  // TOGETHER is offered only when you kept most spirits' promises (PROMISES).
  {
    id: 'l19b', level: 19, after: true, repeat: true, spirit: 'ice', dog: 'stare', title: 'The last bowl',
    steps: [
      { who: 'STORY', text: 'The last guest goes home. The street is white and still. Only Eoreum is left, at the end of the counter.' },
      { who: 'STORY', text: 'You set the bowl down. Tteokguk, egg on top, the way she wrote it. The steam rises into the cold.' },
      { who: 'ice', text: '...One more bowl. ...She promised.' },
      { who: 'STORY', if: 'scarf_warmed', text: 'The red scarf hangs by the stove, dry and warm. Eoreum looks at it for a long time.' },
      { who: 'STORY', if: 'scarf_kept', text: 'The red scarf lies by the bell. Chimaek has slept on it all week.' },
      { who: 'ice', if: 'scarf_returned', text: '...You gave the river her scarf. ...I kept it. ...As warm as I could.' },
      { who: 'STORY', text: 'Eoreum eats slowly. With every spoonful a little frost falls away from it, and the crack down its side closes.' },
      { who: 'ice', text: '...It tastes like her. ...Like the first winter. ...Like being expected.' },
      { who: 'ice', text: '...Now what, keeper?' },
      {
        choice: [
          { text: 'Ring the bell.', effect: { ending: 'thaw', flag: 'final_ring' },
            reply: [
              { who: 'STORY', text: 'You take the bell out from under the counter. Chimaek lets you. She has been waiting for this.' },
              { who: 'STORY', text: 'You ring it on purpose. Once, loud and clear. The whole street remembers itself.' },
              { who: 'ice', text: '...Oh. ...So that is what it sounds like, from up here.' },
              { who: 'STORY', text: 'Down at the river the ice cracks from bank to bank. Then it breaks open, and the water runs.' },
              { who: 'ice', text: '...Spring. ...Thank you, keeper. ...I will be the river again. ...Warm, for a while.' },
              { who: 'STORY', text: 'Eoreum melts into a small cloud of steam and drifts down to the water. Somewhere, something blooms.' },
            ] },
          { text: 'One bowl, every winter. I promise.', effect: { ending: 'keeper', flag: 'final_promise' },
            reply: [
              { who: 'STORY', text: 'You chalk it on the specials board, under the bell: ONE BOWL, EVERY WINTER.' },
              { who: 'ice', text: '...Every winter? ...Like her?' },
              { who: 'ice', text: '...Then I will come back. ...Every year. ...I will wait my turn.' },
              { who: 'STORY', text: 'The river thaws a little. Not all the way. Enough. Eoreum stays to the end of the night, quiet, at the end of the counter.' },
              { who: 'STORY', text: 'It leaves frost flowers on the empty bowl. You keep the bowl.' },
            ] },
          { text: 'Everyone, come cook with me.', if: 'together_ready', effect: { ending: 'together', flag: 'final_together' },
            reply: [
              { who: 'STORY', text: 'You call, and they come. Deung lights the stove. Ikki brings the coins. Yeo hums. Gim warms the bowls.' },
              { who: 'STORY', text: 'Gaeguri sings the wok song, badly. Nabang reads the recipe out loud. Jongi turns the page. Ttuk boils the water, proud.' },
              { who: 'rabbit', text: 'A promise kept by everyone is very hard to break. The moon is proud of you.' },
              { who: 'STORY', text: 'Eoreum is not at the end of the line anymore. It is in the middle, with a bowl, among friends.' },
              { who: 'STORY', text: 'Chimaek barks twice. Once for grandma. Once for you.' },
              { who: 'ice', text: '...I was never hungry for soup. ...I was hungry for this.' },
              { who: 'STORY', text: 'Down at the river the ice softens and sings. Spring will come slowly this year. Nobody is in a hurry.' },
            ] },
        ],
      },
    ],
  },
];

// ---------- part 3: the endings ----------
// Every ending is a good one. `title` heads the epilogue card; `lines` are
// its few words; `badge` is the badge it earns (goals.js).
export const ENDINGS = {
  thaw: {
    n: 1, title: 'SPRING', name: 'THE THAW', badge: 'thaw',
    lines: ['The river runs again.', 'Blossoms drift past the stall.', 'Chimaek sleeps in the sun.', 'The bell rings every evening now.'],
  },
  keeper: {
    n: 2, title: 'THE KEEPER', name: 'ONE BOWL A YEAR', badge: 'keeper',
    lines: ['Every winter, at the end of the line,', 'a quiet guest waits for one bowl.', 'You always save it the best one.', 'Eoreum comes back as a regular.'],
  },
  together: {
    n: 3, title: 'TOGETHER', name: 'THE WHOLE MARKET', badge: 'together',
    lines: ['Nobody eats alone at this stall.', 'Not the spirits, not the winter.', 'Not you.', 'Chimaek barked twice. Deung counted.'],
  },
};
export const ENDING_IDS = Object.keys(ENDINGS);

// Grandma's promises to each spirit, and the choices that keep them (any one
// counts). Keep TOGETHER_MIN of them, across all three parts, and the whole
// market cooks the last bowl with you (the TOGETHER ending).
export const PROMISES = {
  lantern: ['deung_told', 'ice_warm'], // the light would never go out
  fox: ['yeo_hum', 'yeo_debt'], // never to ask about the face
  moss: ['ikki_promise'], // the first drumstick, every batch
  frog: ['frog_teacher', 'scarf_warmed'], // to learn the wok song
  moth: ['letter_read', 'letter_kept', 'letter3_read'], // her letters, delivered
  crane: ['supper_first', 'bell_known'], // nobody leaves hungry
  wisp: ['gim_stay'], // a warm basket to sleep in
  clay: ['ttuk_thanks', 'ttuk_forgiven', 'ttuk_mended'], // a thank you, at last
  rabbit: ['dal_promise', 'promise_keep'], // the promise itself
};
export const TOGETHER_MIN = 6;
export const promisesKept = (flags = {}) => Object.keys(PROMISES).filter((id) => PROMISES[id].some((f) => flags[f])).length;
// Flags the story works out (no choice sets them).
export const DERIVED_FLAGS = ['together_ready'];
export const derivedFlags = (story) => ({ together_ready: promisesKept(story.flags) >= TOGETHER_MIN });
// The scene before a level, and the one after it (nights 13 and 19).
export const sceneFor = (levelN) => SCENES.find((s) => s.level === levelN && !s.after) || null;
export const afterSceneFor = (levelN) => SCENES.find((s) => s.level === levelN && s.after) || null;
export const sceneById = (id) => SCENES.find((s) => s.id === id) || null;

// ---------- story save ----------
export function newStory() {
  // endings: how many times each ending was reached (part 3 finale).
  return { seen: {}, flags: {}, rel: {}, memories: {}, picks: {}, service: {}, endings: {} };
}
export function normalizeStory(s) {
  const d = newStory();
  if (!s || typeof s !== 'object') return d;
  for (const k of Object.keys(d)) if (s[k] && typeof s[k] === 'object') d[k] = s[k];
  return d;
}
// Relationship turns into a tip bonus (or a smaller tip) on a happy serve.
export const relTip = (story, spirit) => Math.max(-1, Math.min(2, story.rel[spirit] || 0));
export function relTips(story) {
  const out = {};
  for (const id of Object.keys(SPIRITS)) out[id] = relTip(story, id);
  return out;
}

// ---------- regulars (level 8 on) ----------
// Every spirit's service record across nights: happy serves, and misses
// (a walk-out or a wrong order). Spirits with a record are regulars.
export function recordService(story, spirit, happy) {
  if (!SPIRITS[spirit]) return;
  const r = (story.service[spirit] ||= { happy: 0, missed: 0 });
  if (happy) r.happy += 1; else r.missed += 1;
}
// A regular's mood: from your story choices (relationship) and how you have
// served them. null for a spirit who has never been served (not a regular).
export function moodFor(story, spirit) {
  const r = story.service[spirit];
  if (!r || r.happy + r.missed === 0) return null;
  let score = relTip(story, spirit);
  if (r.happy >= 3) score += 1;
  if (r.missed >= 2) score -= 1;
  if (r.missed > r.happy) score -= 1;
  return score >= 2 ? 'glad' : score <= -1 ? 'grumpy' : 'ok';
}
export function moodsFor(story) {
  const out = {};
  for (const id of Object.keys(SPIRITS)) { const m = moodFor(story, id); if (m) out[id] = m; }
  return out;
}

// ---------- dialogue state machine ----------
// d.cur is the line on screen; d.choice is set while a choice is waiting
// (shown under d.cur). Replays (from the story log) change nothing.
export function startScene(scene, story, { replay = false } = {}) {
  const d = { scene, pc: 0, pending: [], cur: null, choice: null, done: false, replay, flags: { ...story.flags, ...derivedFlags(story) }, picks: [], ending: null };
  next(d);
  return d;
}
function shows(step, flags) {
  if (step.if && !flags[step.if]) return false;
  if (step.unless && flags[step.unless]) return false;
  return true;
}
function next(d) {
  while (d.pending.length) {
    const s = d.pending.shift();
    if (shows(s, d.flags)) { d.cur = s; return; }
  }
  const steps = d.scene.steps;
  while (d.pc < steps.length) {
    const s = steps[d.pc++];
    if (!shows(s, d.flags)) continue;
    if (s.choice) {
      d.choice = s.choice.filter((o) => shows(o, d.flags));
      if (!d.cur) d.cur = { who: d.scene.spirit, text: '...' };
      return;
    }
    d.cur = s;
    return;
  }
  d.done = true;
}
// Next line. Does nothing while a choice is waiting.
export function advance(d) {
  if (d.done || d.choice) return false;
  next(d);
  return true;
}
export function choose(d, k, story) {
  if (!d.choice || !d.choice[k]) return false;
  const opt = d.choice[k];
  d.choice = null;
  d.picks.push(k);
  const e = opt.effect || {};
  if (e.flag) d.flags[e.flag] = true;
  if (e.ending) d.ending = e.ending;
  if (!d.replay && story) {
    const sp = e.who || d.scene.spirit;
    if (sp) story.rel[sp] = (story.rel[sp] || 0) + (e.rel || 0);
    if (e.flag) story.flags[e.flag] = true;
    if (e.ending) story.endings[e.ending] = (story.endings[e.ending] || 0) + 1;
    (story.picks[d.scene.id] ||= []).push(k);
  }
  d.pending = [...(opt.reply || [])];
  next(d);
  return true;
}
// Skip to the end. A choice not made has no effect.
export function skip(d) {
  d.choice = null; d.pending = []; d.pc = d.scene.steps.length; d.done = true;
}
export function finishScene(d, story) {
  if (!d.replay && story) story.seen[d.scene.id] = true;
}
export const speakerName = (who) => (who === 'STORY' ? '' : who === 'YOU' ? 'YOU' : who === 'VOICE' ? '???' : SPIRITS[who]?.name || String(who).toUpperCase());

// ---------- memories (lines unlocked as you serve spirits across nights) ----------
// One new line per spirit per night: `night` is a token for the current night
// (the game object), so a spirit served twice in one night unlocks one line.
export function unlockMemory(story, spirit, nightSet) {
  const sp = SPIRITS[spirit];
  if (!sp || nightSet.has(spirit)) return null;
  const k = story.memories[spirit] || 0;
  if (k >= sp.memories.length) return null;
  nightSet.add(spirit);
  story.memories[spirit] = k + 1;
  return memoryText(spirit, k, story.flags);
}
