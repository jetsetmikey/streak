/* Close Call: one deadly situation a day, the same for everyone.
 *
 * Each situation hides a clue in plain sight. `facts` are the truth behind
 * it; only the narrator sees them. `catch` is what the player is told once
 * the verdict is in. Close call #1 is the first entry, #2 the second, and
 * so on, wrapping round when the list runs out. */
(function (root) {
  'use strict';
  const CC = (root.CC = root.CC || {});

  CC.SCENARIOS = [
    {
      title: 'The Runaway Lift',
      text: "You're alone in a lift on the 40th floor when the cable snaps with a loud twang, and the lift starts to fall. Beside the buttons, a little panel marked DO NOT OPEN rattles in its frame.",
      items: ['a golf umbrella', 'a rubber duck', 'a family-size tin of beans'],
      facts:
        'The lift is in free fall and hits the bottom in about five seconds. Behind the DO NOT OPEN panel is a big red emergency brake lever: pulling it stops the lift safely. Jumping just before impact does nothing, because the character is falling as fast as the lift. Pressing the floor buttons does nothing. Lying flat on the floor spreads the impact but is a long shot. The umbrella cannot slow a lift.',
      catch: "The DO NOT OPEN panel hid the emergency brake. Jumping at the last second never works, because you're falling just as fast as the lift.",
    },
    {
      title: 'Public Footpath',
      text: "You're walking your dog on a footpath across a field when forty cows turn and trot towards you. Several have young calves at their sides. Your dog, on a short lead, barks at them furiously.",
      items: ['a dog lead, with dog attached', 'a flask of soup', 'a folded paper map'],
      facts:
        'The cows are protecting their calves from the dog, not from the character. Letting go of the lead lets the dog run off (dogs easily outrun cows and come home fine), and the herd follows the dog or loses interest while the character walks calmly and steadily to the edge of the field. Holding on to the dog, picking it up, running in a panic, or walking between cows and calves gets the character trampled.',
      catch: 'The cows were protecting their calves from your dog. Let go of the lead: the dog outruns the herd and gets home fine, and you walk calmly to the edge of the field.',
    },
    {
      title: 'A Toast To You',
      text: "At a very grand dinner party, the host rises to toast you, and forty guests turn to watch you drink. Your red wine smells faintly of almonds. The host's own glass stands right beside yours.",
      items: ['a bread roll', 'a party popper', 'a fake moustache'],
      facts:
        "The character's wine is poisoned with cyanide (the almond smell). The host's glass is safe. Swapping glasses without being seen, spilling the wine by 'accident', tipping it into a plant, only pretending to sip, or refusing with a convincing excuse all work. Drinking any of the character's own wine kills them. The party popper makes a good distraction.",
      catch: "A smell of almonds is the classic sign of cyanide. Your glass was poisoned and the host's wasn't, so a quick swap would have done nicely.",
    },
    {
      title: 'Something In The Water',
      text: "You're snorkelling off a sunny beach when a grey fin rises out of the water nearby, dips under, and rises again. You swim hard for the shore, but every time you look up, the beach seems a little further away.",
      items: ['a snorkel', 'a pool noodle', 'a waterproof camera'],
      facts:
        'The fin belongs to a friendly dolphin (it rises and dips in arcs; a shark fin glides). The real danger is a rip current dragging the character out to sea. Swimming straight at the beach against it exhausts them and they drown. Swimming parallel to the beach until the current lets go, then swimming in, works. Floating on the pool noodle and waving for help also works. Fighting or fleeing the dolphin does nothing about the real danger.',
      catch: 'The fin was a dolphin, which is why it rose and dipped. The real danger was a rip current: swim along the beach until it lets go, then swim in.',
    },
    {
      title: 'Chips Are Down',
      text: "You're making chips when the pan of oil bursts into flames taller than you are. The smoke alarm shrieks. Right beside the cooker stand a jug of water and an open bag of flour.",
      items: ['a baking tray', 'a damp tea towel', 'an oven glove'],
      facts:
        'Water on burning oil makes it explode in a fireball. Flour thrown on it can go up in a fireball too. Turning off the heat and smothering the pan with the baking tray or the damp (not dripping) tea towel works. Carrying the burning pan outside is likely to spill it. Leaving the kitchen, shutting the door and calling the fire brigade also survives.',
      catch: 'Water or flour on burning oil makes it explode. Turn off the heat and smother the pan with the tray or the damp towel.',
    },
    {
      title: 'Scenic Route',
      text: 'Your self-driving taxi has locked its doors and is speeding along a clifftop road. The screen reads DESTINATION: CLIFF EDGE VIEWPOINT (SCENIC). A sticker on the dashboard says: For your safety, this vehicle will not move while a seatbelt is unfastened.',
      items: ['a phone on 3% battery', 'a bag of crisps', 'a traffic cone'],
      facts:
        'The car goes over the cliff in about thirty seconds. Unbuckling the seatbelt makes it brake to a gentle stop, exactly as the sticker says. Changing the destination on the screen also works if the character does it specifically. Shouting at the car does nothing. Smashing a window and jumping out at this speed kills them. A phone call takes too long.',
      catch: 'The sticker told you how. Unbuckle your seatbelt and the car stops by itself.',
    },
    {
      title: 'Hair Standing On End',
      text: "A storm rolls over the golf course while you're on the 9th hole. Suddenly the hair on your arms and head stands straight up, and your metal golf club starts to hum. A big lone oak tree stands twenty metres away.",
      items: ['a metal golf club', 'a golf umbrella', 'a scorecard and a tiny pencil'],
      facts:
        'Hair standing on end and humming metal mean lightning is about to strike exactly where the character stands, within seconds. The lone oak is a lightning magnet: sheltering under it kills them. Holding up the club or the umbrella kills them. Dropping the metal and crouching low on the balls of the feet with feet together and head tucked in (not lying flat), or immediately running away from the tree towards low ground, gives a good chance.',
      catch: 'Hair standing on end means lightning is about to strike exactly where you are. Drop the metal, crouch low with your feet together, and keep away from the lone tree.',
    },
    {
      title: 'And Now, For My Next Trick',
      text: "You volunteered to be sawn in half by a very nervous magician. You're lying in the box with your head sticking out of one end and your feet out of the other, and the saw is coming down. Inside the box, by your knees, you find a pair of fake feet on a stick.",
      items: ['a white rabbit', 'a deck of cards', 'a magic wand'],
      facts:
        "This is how the trick works: the volunteer pulls their real legs in, curls up in the head end of the box, and pokes the fake feet out of the far end. The saw then cuts through empty space and the crowd goes wild. Shouting 'stop' fails because the magician thinks it's part of the act. Wriggling out of the box works only if it's instant and specific.",
      catch: 'The fake feet were the trick. Pull your legs in, curl up at the head end, and poke the fake feet out of the far end.',
    },
    {
      title: 'The Frozen Lake',
      text: "You're halfway across a frozen lake when you hear a long, deep crack. The ice ahead of you looks dark and wet. Behind you, your own footprints lead back to the shore across white, snowy ice.",
      items: ['a hockey stick', 'a flask of hot tea', 'a pair of ice skates'],
      facts:
        'The dark, wet ice ahead is thin and breaks under any weight. The white ice behind, along the footprints, already held the character and is thick. Lying flat to spread their weight and crawling or rolling back along their footprints works. Going forward, running, jumping or stamping breaks the ice. Laying the hockey stick flat to spread weight or to test the ice helps. Hot tea poured on ice weakens it.',
      catch: 'Dark, wet ice is thin. The ice you had already crossed held your weight, so lying flat and crawling back along your footprints was the way home.',
    },
    {
      title: 'Snapped Tether',
      text: "You're on a spacewalk when your safety line snaps. You're drifting slowly away from the space station, turning gently, and the gap is already three metres. The fuel light on your jetpack is blinking EMPTY.",
      items: ['a heavy wrench', 'a fire extinguisher', 'a sandwich'],
      facts:
        "In space, throwing something hard directly away from the station pushes the character back towards it (Newton's third law). Throwing the wrench away from the station, or firing the fire extinguisher away from it, works. Swimming or flapping does nothing. Just waiting means drifting away for ever. Radioing the crew for a line works only if it's a specific plan. Opening the helmet kills them at once.",
      catch: 'In space, throwing something away from the station pushes you back towards it. The wrench, thrown hard, or the fire extinguisher, fired away from the station, would have got you home.',
    },
    {
      title: 'Look Up',
      text: "You're licking an ice cream on the pavement when a rope creaks and snaps somewhere high above you. On the ground, a piano-shaped shadow is growing fast around your feet. It stretches much further to your left than to your right.",
      items: ['an ice cream', 'a rolled-up newspaper', 'a pogo stick'],
      facts:
        'A grand piano is falling from the fifth floor and lands in two seconds, exactly on its shadow. Most of the shadow is on the left, so one big step, leap or dive to the right clears it. Moving left or staying put is fatal, and so is stopping to look up first. Catching or deflecting the piano is impossible. A long move forwards or backwards might just clear it.',
      catch: 'The piano lands on its own shadow, and most of the shadow was to your left. One big dive to the right was all it took.',
    },
    {
      title: 'The Bees',
      text: "You've knocked a beehive over with your picnic basket, and a furious cloud of bees is rising around you. A pond sits twenty metres to your left, and your car is parked a hundred metres behind you. The bees swarm thickest around the half-eaten banana in your hand.",
      items: ['a half-eaten banana', 'a picnic blanket', 'a bottle of perfume'],
      facts:
        "Bananas smell like the bees' alarm signal, so the bees go for whoever holds one: dropping or throwing it away first helps a lot. Hiding in the pond fails: the bees wait above the water for as long as it takes. Perfume attracts more bees. Swatting makes it worse. Covering the face with the blanket and running straight to the car, then shutting the doors, survives. Running far away across open ground also survives if the banana is gone.",
      catch: "Bananas smell like a bee's alarm signal, so drop it first. Then cover your face and run for the car. Bees simply wait for you above a pond.",
    },
    {
      title: 'Radio Still Playing',
      text: 'Your car has rolled off the road into a deep river and is starting to sink. Cold water is pouring in around your feet. The engine has died, but the radio is still playing your favourite song.',
      items: ['a travel mug', 'a pair of flip-flops', 'a lucky horseshoe'],
      facts:
        "The radio playing means the electrics still work for a few more seconds, so the electric windows still open. Unbuckling, opening the window right now and climbing out works. Waiting for the car to fill up so the door opens is a myth that drowns people. The door won't open against the water. Smashing a side window is hard but possible with the horseshoe if they strike a corner. A phone call takes too long.",
      catch: 'The radio meant the electrics still worked for a few seconds. Open the electric window at once and climb out. Waiting for the car to fill up is a myth that drowns people.',
    },
    {
      title: 'Beware Of The Dog',
      text: "You've climbed into a scrapyard to fetch your frisbee. An enormous dog bursts out of a shed and charges at you, dragging a heavy chain that rattles along the ground behind it. Your frisbee is lying two metres in front of you.",
      items: ['a squeaky toy', 'a hoodie', 'a skateboard'],
      facts:
        'The dog is chained. The chain runs out one metre in front of the character, between them and the frisbee. Standing still, backing away calmly, running away, or leaving without the frisbee all survive. Stepping forward to grab the frisbee, attacking the dog, or going towards it ends very badly.',
      catch: "The rattling chain was the clue. The dog was chained up and couldn't reach you, unless you stepped forward for the frisbee.",
    },
    {
      title: 'Staff Only',
      text: "The door of a restaurant's walk-in freezer has swung shut behind you, and the handle has come off in your hand. It's minus twenty and everyone else has gone home. Near the bottom of the door, a small red knob pokes out through the frost.",
      items: ['a frozen leg of lamb', 'a spatula', 'a box of fish fingers'],
      facts:
        'The red knob is the safety release on the inside: pushing it opens the door. Banging and shouting do nothing, because everyone has gone home. Waiting until morning means freezing to death. Prying at the latch with the spatula can work if done specifically. Keeping warm by exercising buys time but saves nobody.',
      catch: 'Walk-in freezers have a safety release on the inside. Push the little red knob and the door opens.',
    },
    {
      title: 'Mother Bear',
      text: "You're hiking alone when a brown bear steps onto the path ten metres ahead and rises up on its back legs. From the bushes just behind you comes a small, high-pitched whimper.",
      items: ['a whistle', 'a jar of honey', 'a paper map'],
      facts:
        "The bear is a mother and her cubs are in the bushes right behind the character. Backing away along the path puts them among the cubs, and the mother charges. Running makes her chase. Moving slowly sideways off the path, away from both the bear and the bushes, talking calmly and not staring at her, survives. Throwing the honey well away from the cubs and the character can distract her. Climbing a tree fails: bears climb better than people. Playing dead once she charges (face down, hands behind the neck) can work.",
      catch: 'The whimper was a cub, right behind you. Backing away walks you into her cubs. The way out was slowly sideways, talking calmly.',
    },
    {
      title: "Tide's Coming In",
      text: "You're crossing a wide, muddy bay at low tide when you sink into quicksand up to your knees. The harder you pull, the deeper you go. Strands of seaweed are starting to drift past your legs, heading inland.",
      items: ['a kite', 'a bucket and spade', 'a cheese sandwich'],
      facts:
        'Quicksand rarely swallows a person, but the tide is coming in fast (the seaweed drifting inland) and will drown the character in minutes. Pulling hard makes it worse. Leaning back to spread their weight, wiggling the legs slowly to let water in and loosen them, then crawling or rolling flat to firm ground works. Digging around the legs with the spade helps if done quickly. Waiting for rescue drowns them.',
      catch: 'The seaweed drifting inland meant the tide was coming in fast. Lean back to spread your weight, wiggle your legs free slowly, and crawl out flat.',
    },
    {
      title: 'Pilot Light',
      text: "Your hot-air balloon's burner has gone out with a sad little pop, and you're sinking towards a lake. The pilot has fainted. Heavy sandbags hang on hooks around the outside of the basket.",
      items: ['a lighter', 'a bottle of champagne', 'a very fancy hat'],
      facts:
        'The burner can be relit with the lighter (open the gas valve and hold the flame to the burner). Unhooking the sandbags lightens the basket so it settles gently onto the water, where they can swim ashore. Either works. Jumping out from high up kills them. Popping the champagne does nothing useful. Waking the pilot takes too long.',
      catch: 'Relight the burner with the lighter, or unhook the sandbags. Ballast is there to be dropped.',
    },
    {
      title: 'Doorbuster',
      text: "It's the first minute of a huge sale and you're near the front of the crowd. Thousands of shoppers surge in behind you, pressing you towards the shop's glass doors, which are still locked. You're finding it hard to breathe.",
      items: ['a shopping trolley', 'a loyalty card', 'a bag of frozen peas'],
      facts:
        'In a crowd crush, people die because they cannot breathe. The locked glass doors ahead are the most dangerous place. Keeping the arms up in front of the chest like a boxer to protect breathing room, staying on their feet, and drifting diagonally with the gaps towards the side walls, away from the doors, survives. Pushing back against the crowd, bending down to pick something up, or falling over kills them. The trolley in front of them buys a little room but can trip them.',
      catch: 'In a crush, the danger is not being able to breathe. Keep your arms up to guard your chest, and drift diagonally to the side, away from the locked doors.',
    },
    {
      title: 'Water Hazard',
      text: 'Your golf ball has rolled to the edge of a pond in Florida. As you walk over to fetch it, you notice that the log floating near the bank has nostrils. It sinks quietly out of sight.',
      items: ['a golf club', 'a golf cart', 'a tuna sandwich'],
      facts:
        'The log is an alligator lurking under the water right by the ball. Going to the edge of the water for the ball gets the character grabbed. Leaving the ball and walking calmly away from the water survives, and so does driving off in the golf cart. Throwing the sandwich into the water brings the alligator closer. Running away also survives: alligators rarely chase far from the water.',
      catch: 'The log was an alligator, waiting right by your ball. Leave the ball and walk away from the water.',
    },
    {
      title: 'Cosy',
      text: "You're in a snug log cabin on a snowy night. The stove is burning with a lazy yellow flame, you have a mild headache, and you feel very, very sleepy. Your dog has been asleep for hours and doesn't wake when you call.",
      items: ['a hot-water bottle', 'a half-finished crossword', 'a scented candle'],
      facts:
        'The stove is leaking carbon monoxide. Going to sleep kills the character. Getting outside into the fresh air right now, ideally carrying the dog, and throwing open the doors and windows survives. Only turning the stove off, without getting fresh air, is too slow. Lighting the candle does nothing useful.',
      catch: "A headache, sleepiness and a dog that won't wake are signs of carbon monoxide. Get outside into the fresh air, and take the dog.",
    },
    {
      title: 'Stuck At The Top',
      text: 'The Ferris wheel has stopped with your little car at the very top, swinging in the wind. Every time you lean to the left, a bolt on the left side of the car groans.',
      items: ['a giant teddy bear you just won', 'a stick of candyfloss', 'a kazoo'],
      facts:
        "The bolt on the left is loose. Leaning left or rocking the car pops it and the car tips over. Sitting still with their weight to the right and waiting for the wheel to restart (it restarts within a minute) survives. Climbing out onto the frame kills them. Waving and shouting for help is fine as long as they don't rock the car.",
      catch: 'The groaning bolt was loose. Sitting still with your weight to the right was all it took.',
    },
    {
      title: 'Nice Rock',
      text: "You're paddling a canoe down a slow African river. Ahead, a large grey rock sits in the middle of the current. As you drift closer, the rock twitches its ears and yawns, showing some very large teeth.",
      items: ['a paddle', 'a bunch of bananas', 'a pair of binoculars'],
      facts:
        'The rock is a hippo, one of the most dangerous animals in Africa. Drifting past close by gets the canoe bitten in half. Paddling calmly to the bank well before reaching it, getting out and walking round at a distance survives. Banging the paddle on the canoe from far away to warn it is fine. Throwing bananas does nothing.',
      catch: 'The rock was a hippo, and hippos attack boats that come close. Paddle to the bank, get out, and walk around it at a distance.',
    },
    {
      title: 'Room 404',
      text: "You wake in a hotel room to the sound of the fire alarm. Smoke is curling in under the door, and when you touch the door handle, it's hot. Your window is five floors above the street.",
      items: ['a hotel dressing gown', 'an ice bucket', 'a tiny minibar chocolate'],
      facts:
        'A hot handle means fire right outside. Opening the door kills the character. Sealing the gap under the door with the dressing gown (wet it with the ice bucket in the bathroom), opening the window for air, staying low and signalling for help from the window survives: firefighters arrive within minutes. Jumping from five floors kills them. Hiding in the bathroom without sealing out the smoke is a long shot.',
      catch: 'A hot handle means fire on the other side. Seal the gap under the door with the wet gown, stay low, and wave for help from the window.',
    },
    {
      title: 'Mirage',
      text: 'Your jeep has broken down in the desert at midday, and your last water bottle is empty. The nearest town is 40 kilometres away. To the east, a thin line of green bushes runs along a dry riverbed.',
      items: ['a car mirror', 'a plastic sheet', 'a spare tyre'],
      facts:
        "Walking 40 km in the midday heat kills the character. Staying with the jeep (rescuers look for vehicles) and resting in its shade until evening survives. Burning the spare tyre makes thick black smoke that rescuers see. Flashing the mirror at a passing plane works. The green bushes mean there is water just below the surface of the dry riverbed: digging there finds some. Setting off at night rather than in the day heat is a fair gamble.",
      catch: 'Walking in the midday heat kills. Stay with the jeep, where rescuers look, rest in its shade, and burn the tyre for smoke or dig for water under the green bushes.',
    },
    {
      title: 'Twister',
      text: 'A tornado is tearing across the fields towards your car. Just ahead, the road passes under a concrete motorway bridge that looks like a good place to shelter. A deep, dry ditch runs alongside the road.',
      items: ['a car blanket', 'a crash helmet', 'a sat nav'],
      facts:
        'Sheltering under the bridge is deadly: the wind speeds up underneath it and fills with flying debris. Staying in the car is deadly too: the tornado can pick it up. Lying face down in the deep ditch with the head covered (the crash helmet is perfect) survives. Driving away at right angles to its path is a gamble this close.',
      catch: 'Bridges are death traps in a tornado, because the wind speeds up underneath them. Lie flat in the ditch and protect your head.',
    },
    {
      title: 'Finders Keepers',
      text: "Deep in an ancient temple, your hand hovers over a golden idol on a stone pedestal. It's small but looks very heavy. There's a thin crack all the way around the pedestal, and the walls are dotted with little holes.",
      items: ['a bag of sugar', 'a flaming torch', 'a sausage roll'],
      facts:
        'The pedestal is a pressure plate. If the weight on it changes, poison darts fly from the holes in the walls. Swapping the idol for the bag of sugar (about the same weight) in one smooth move survives, and the character keeps the idol. Leaving the idol alone also survives, but the narrator may tease them for it. Grabbing the idol without a swap kills them.',
      catch: 'The pedestal was a pressure plate wired to poison darts. Swap in the bag of sugar in one smooth move, or just leave the idol alone.',
    },
    {
      title: 'The 7:42 Is On Time',
      text: 'Your foot is stuck between the rails at a level crossing, and the barriers are coming down. A train horn blares round the bend. Your trainer is wedged in tight, but its laces are loose.',
      items: ['a pocket knife', 'a harmonica', 'a bag of sour sweets'],
      facts:
        "The train arrives in about fifteen seconds and cannot stop in time. Pulling the foot out of the loose trainer works. Cutting the laces with the knife also works. Pulling hard with the shoe still on does not. Waving at the driver does nothing because the train can't stop.",
      catch: 'The loose laces were the answer. Slip your foot out of the trainer and leave it behind.',
    },
    {
      title: 'Morning Guest',
      text: 'You wake up in a jungle hut to find a snake coiled on your chest, warm and heavy. It has bands of red, yellow and black, and the red bands touch the yellow ones.',
      items: ['a pillow', 'a glass of water', 'a bedside lamp'],
      facts:
        "It's a coral snake, which is deadly ('red touches yellow, kills a fellow'). It is calm, and bites only if grabbed, hit or trapped. Lying very still until it slides away, or sliding out from under it very slowly, survives. Grabbing it, throwing it, flinging it off or hitting it gets the character bitten and killed. Easing it off gently with the pillow is risky but can work.",
      catch: 'Red touching yellow means a coral snake, one of the deadliest. It only bites when grabbed or hit, so lying still until it leaves saves you.',
    },
    {
      title: 'Pull Cord',
      text: 'You jump from the plane, count to five and pull the cord. Nothing happens. The ground is rushing up to meet you, and something hard is bumping against your chest: a second handle, painted yellow.',
      items: ['a pair of goggles', 'a bag of plane peanuts', 'a lucky coin'],
      facts:
        'The main parachute has failed. The yellow handle on the chest opens the reserve parachute, and pulling it right now survives. Waiting, flapping, or trying to fix the main parachute by hand uses up the few seconds left.',
      catch: 'The yellow handle on your chest opens the reserve parachute. Pull it straight away.',
    },
    {
      title: 'Rising Water',
      text: "Flood water has trapped you on the roof of your house. A rescue helicopter is sweeping the area but hasn't spotted you. Every few minutes, another brick falls off the chimney you're leaning on and plops into the water.",
      items: ['a bathroom mirror', 'a red tablecloth', 'a trumpet'],
      facts:
        "The chimney is crumbling and collapses if leaned on, climbed, or used to tie on to. Moving away from it along the roof is safe. The helicopter spots a mirror flashing sunlight or a red tablecloth being waved. Swimming in the flood water (fast, cold and full of debris) kills them. The trumpet is too quiet to hear over a helicopter.",
      catch: 'The chimney was crumbling. Move away from it, then flash the mirror or wave the red cloth at the helicopter.',
    },
    {
      title: 'Tourist Season',
      text: 'You\'re on a volcano tour when the ground starts to shake and the guide runs off downhill. A cloud of gas that smells of rotten eggs is rolling down the slope and pooling in the valley below.',
      items: ['a selfie stick', 'a bag of marshmallows', 'a wet towel'],
      facts:
        'The gas is heavier than air and collects in low ground: following the guide down into the valley kills the character. Climbing to higher ground, across the slope and away from the gas, with the wet towel over the nose and mouth, survives. Stopping to take photos is risky. Lava is not the danger today.',
      catch: 'Volcanic gas is heavier than air and collects in low ground. Head uphill and across, with the wet towel over your face.',
    },
  ];
})(typeof globalThis !== 'undefined' ? globalThis : this);
