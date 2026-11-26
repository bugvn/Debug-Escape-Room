// PUZZLE BANK + category map. Plain data, no page code, so game-room.html, tests and
// tools/verify_bank.py all read the same file.
//
// Every object in the room owns one category (SPOT_CATEGORY), and every puzzle's title + story is
// themed on that object, so the window always shows a window puzzle, the clock a clock puzzle, etc.
// Keep 2+ puzzles per (category x level) cell so rooms can rotate. The game picks 4 per room
// (see js/adaptive.js). Existing ids are kept even when a puzzle is reskinned, so saved data still matches.
//
// Fields
//   id, category, level   what it trains and how hard it is
//   title                 shown on the object label and puzzle window
//   story                 mission text (end it with "Fix the code and run it.")
//   code                  buggy program the player edits
//   expect                exact output the fixed program prints
//   file, status, badge   flavour text in the code panel
//   bug                   0-based line numbers highlighted red in the code panel
//   why                   explanation shown after solving
//   hint                  2 steps, vague first then specific
//   needDef               function name the answer must still define (validate())
//   variant               hidden check 1: re-run the same code on other data. {re, to, expect}.
//                         "to" may use {1} {2} for regex groups.
//   probes                hidden check 2: call a function with other inputs. [{fn,args,expect}]
//   needCall              hidden check 3: the result must come from a real call to this function

const CATEGORIES = ['Index', 'Type', 'Recursion', 'Scope'];           // what a room can train
const MISTAKE_CATEGORIES = [...CATEGORIES, 'Syntax', 'Logic', 'Other']; // what a player's wrong answer can be tagged as
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

// One object per category. Single source of truth: game-room.html, js/adaptive.js and the tests all read it.
const SPOT_CATEGORY = { window: 'Index', fridge: 'Type', kettle: 'Recursion', clock: 'Scope' };

// Mistake tag (what the player's code actually did) -> category. One lookup for the whole app.
// Tags come from evaluate() in game-room.html: Python error names + 3 game tags.
const TAG_CATEGORY = {
  IndexError: 'Index', KeyError: 'Index',
  TypeError: 'Type', ValueError: 'Type', AttributeError: 'Type',
  RecursionError: 'Recursion',
  NameError: 'Scope', UnboundLocalError: 'Scope',
  SyntaxError: 'Syntax', IndentationError: 'Syntax', TabError: 'Syntax',
  ZeroDivisionError: 'Logic', 'Wrong Output': 'Logic', 'Infinite Loop': 'Logic', 'Hardcoded Answer': 'Logic'
};
function categoryOfTag(tag) { return TAG_CATEGORY[tag] || 'Other'; }

const PUZZLE_BANK = [
  /* ================= BEGINNER ================= */
  /* --- window (Index) --- */
  { id: 'b-index-stars', category: 'Index', level: 'BEGINNER', title: 'Cactus Star Tags',
    story: 'The Cactus on the windowsill has five glowing star tags stuck to it. The program should add up their brightness, but it crashes. Fix the code and run it.',
    expect: '14', file: 'cactus_stars.py', status: 'index_out_of_range', badge: 'INDEX FAULT', bug: [2],
    variant: { re: '\\[3,\\s*1,\\s*4,\\s*1,\\s*5\\]', to: '[2, 7, 1, 8]', expect: '18' },
    code: 'stars = [3, 1, 4, 1, 5]\ntotal = 0\nfor i in range(len(stars) + 1):\n    total += stars[i]\nprint(total)',
    why: 'The loop went one index too far. A list of 5 items has valid indexes 0 to 4.',
    hint: ['Count the stars: 5. Now count how many times the loop runs. Do they match?',
      'range(len(stars) + 1) runs 6 times. Drop the + 1, or loop with for s in stars.'] },
  { id: 'b-index-last', category: 'Index', level: 'BEGINNER', title: 'Cactus Sky Chart',
    story: 'A night sky chart is taped to the Cactus pot. It lists moon, comet and nova, and the program should show the last one, "nova", but it crashes. Fix the code and run it.',
    expect: 'nova', file: 'cactus_sky.py', status: 'index_out_of_range', badge: 'INDEX FAULT', bug: [1],
    variant: { re: 'sky\\s*=\\s*\\["moon",\\s*"comet",\\s*"nova"\\]', to: 'sky = ["sun", "mars"]', expect: 'mars' },
    code: 'sky = ["moon", "comet", "nova"]\nlast = sky[len(sky)]\nprint(last)',
    why: 'A list of 3 items has indexes 0, 1, 2. The last valid index is len(sky) - 1 (or -1).',
    hint: ['How many items does sky have? What is the highest index a list that long allows?',
      'The last index is one less than the length: sky[len(sky) - 1], or sky[-1].'] },
  /* --- fridge (Type) --- */
  { id: 'b-type-lock', category: 'Type', level: 'BEGINNER', title: 'Air Conditioner Remote Lock',
    story: 'The Air Conditioner remote has a keypad lock that needs the digit that comes after 7. Fix the code and run it.',
    expect: 'Lock code: 8', file: 'aircon_lock.py', status: 'type_mismatch', badge: 'TYPE FAULT', bug: [1],
    variant: { re: '(digit\\s*=\\s*["\']?)7(["\']?)', to: '{1}4{2}', expect: 'Lock code: 5' },
    code: 'digit = "7"\ncode = digit + 1\nprint("Lock code:", code)',
    why: '"7" is a string. It must be converted with int() before a number can be added to it.',
    hint: ['Look at the quotes around 7. What type does that make it?',
      'Convert it first: int(digit) + 1. Or remove the quotes around 7.'] },
  { id: 'b-type-magnets', category: 'Type', level: 'BEGINNER', title: 'Air Conditioner Magnets',
    story: 'The Air Conditioner has "3" magnets holding its manual and 4 more arrive. The counter should print the total, but it crashes. Fix the code and run it.',
    expect: 'Magnets: 7', file: 'aircon_magnets.py', status: 'type_mismatch', badge: 'TYPE FAULT', bug: [2],
    variant: { re: '(magnets\\s*=\\s*["\']?)3(["\']?)', to: '{1}5{2}', expect: 'Magnets: 9' },
    code: 'magnets = "3"\nextra = 4\ntotal = magnets + extra\nprint("Magnets:", total)',
    why: 'magnets is text because of the quotes. Text and numbers cannot be added until the text is converted with int().',
    hint: ['Read the error: which two types is Python trying to add?',
      'Convert the text first: int(magnets) + extra.'] },
  /* --- kettle (Recursion) --- */
  { id: 'b-recursion-kettle', category: 'Recursion', level: 'BEGINNER', title: 'Teddy Bear Warmer',
    story: 'The Teddy Bear has a bedtime warmer built from an old kettle controller. The heating routine should stop once the target is reached, but it never stops. Fix the code and run it.',
    expect: 'kettle_ready: safe_to_pour', file: 'teddy_warmer.py', status: 'stack_overflow_risk', badge: 'RECURSION FAULT', bug: [3],
    needDef: 'heat_water',
    probes: [{ fn: 'heat_water', args: [55, 100, 0], expect: 'kettle_ready: safe_to_pour' }],
    code: 'def heat_water(current_temp, target_temp, cycle):\n    if current_temp >= target_temp:\n        return "kettle_ready: safe_to_pour"\n    return heat_water(current_temp, target_temp, cycle + 1)\n\nprint(heat_water(20, 100, 0))',
    why: 'current_temp never changes, so it never reaches target_temp and the recursion never stops. Each call must move the temperature forward.',
    hint: ['Does current_temp ever get bigger from one call to the next?',
      'Heat it up on every call: heat_water(current_temp + 10, target_temp, cycle + 1).'] },
  { id: 'b-recursion-steep', category: 'Recursion', level: 'BEGINNER', title: 'Teddy Bear Tea Party',
    story: 'The Teddy Bear is hosting a tea party. Its tea timer should count its minutes down to 0 and then say tea_ready, but it never stops. Fix the code and run it.',
    expect: 'tea_ready', file: 'teddy_tea_party.py', status: 'stack_overflow_risk', badge: 'RECURSION FAULT', bug: [3],
    needDef: 'steep',
    probes: [{ fn: 'steep', args: [2], expect: 'tea_ready' }],
    code: 'def steep(minutes):\n    if minutes == 0:\n        return "tea_ready"\n    return steep(minutes + 1)\n\nprint(steep(3))',
    why: 'The timer moved away from 0 instead of toward it, so the base case was never reached.',
    hint: ['Start at 3. After one call, is the next value closer to 0 or further away?',
      'Count down: steep(minutes - 1).'] },
  /* --- clock (Scope) --- */
  { id: 'b-scope-clock', category: 'Scope', level: 'BEGINNER', title: 'Computer Chime Counter',
    story: 'At 15:00 the clock app on the Computer should chime 3 times, but the program crashes. Fix the code and run it.',
    expect: 'Chimes: 3', file: 'computer_chimes.py', status: 'scope_error', badge: 'SCOPE FAULT', bug: [4, 5],
    needDef: 'ring_hours', needCall: 'ring_hours',
    probes: [{ fn: 'ring_hours', args: [9], expect: '9' }],
    code: 'def ring_hours(hour):\n    chimes = hour % 12\n    return chimes\n\nring_hours(15)\nprint("Chimes:", chimes)',
    why: 'chimes only exists inside the function. Store the returned value in a variable outside it.',
    hint: ['Where does chimes live? Can code outside the function see it?',
      'ring_hours(15) returns a value but nothing catches it. Store it: chimes = ring_hours(15).'] },
  { id: 'b-scope-alarm', category: 'Scope', level: 'BEGINNER', title: 'Computer Alarm Time',
    story: 'The alarm app on the Computer sets its time inside a function and should print "Alarm: 07:00", but the program crashes. Fix the code and run it.',
    expect: 'Alarm: 07:00', file: 'computer_alarm.py', status: 'scope_error', badge: 'SCOPE FAULT', bug: [3, 4],
    needDef: 'set_alarm', needCall: 'set_alarm',
    probes: [{ fn: 'set_alarm', args: [], expect: '07:00' }],
    code: 'def set_alarm():\n    time = "07:00"\n\nset_alarm()\nprint("Alarm:", time)',
    why: 'time is created inside the function, so the outside code cannot see it. Return it and store the result.',
    hint: ['Which line creates time, and which line tries to use it?',
      'Add return time inside the function, then store it outside: time = set_alarm().'] },

  /* ================= INTERMEDIATE ================= */
  /* --- window (Index) --- */
  { id: 'i-index-shelf', category: 'Index', level: 'INTERMEDIATE', title: 'Plant Seed Jars',
    story: 'Seed jars sit in a row around the Plant on the kitchen window. The jar counter should add up every jar, but the while loop crashes. Fix the code and run it.',
    expect: '30', file: 'plant_jars.py', status: 'index_out_of_range', badge: 'INDEX FAULT', bug: [3],
    variant: { re: 'jars\\s*=\\s*\\[3,\\s*6,\\s*9,\\s*12\\]', to: 'jars = [1, 2, 3]', expect: '6' },
    code: 'jars = [3, 6, 9, 12]\ni = 0\ntotal = 0\nwhile i <= len(jars):\n    total += jars[i]\n    i += 1\nprint(total)',
    why: 'The last valid index is len(jars) - 1. Using <= lets i reach len(jars), which does not exist.',
    hint: ['The loop runs while i <= 4. How many jars does the list have?',
      'Change <= to <, so i stops at the last index.'] },
  { id: 'i-index-rings', category: 'Index', level: 'INTERMEDIATE', title: 'Plant Hanger Rings',
    story: 'The Plant hangs from a rack of rings with their sizes in a list. The program should add up every ring, but it crashes. Fix the code and run it.',
    expect: '43', file: 'plant_rings.py', status: 'index_out_of_range', badge: 'INDEX FAULT', bug: [2],
    variant: { re: 'rings\\s*=\\s*\\[4,\\s*8,\\s*15,\\s*16\\]', to: 'rings = [1, 2, 3]', expect: '6' },
    code: 'rings = [4, 8, 15, 16]\ntotal = 0\nfor i in range(1, len(rings) + 1):\n    total += rings[i]\nprint(total)',
    why: 'range(1, len + 1) starts at the second ring and runs past the end. To visit every index, use range(len(rings)).',
    hint: ['Which index does the loop start at, and which does it end at? Compare with 0 and len - 1.',
      'Use range(len(rings)), which gives 0 up to the last index.'] },
  /* --- fridge (Type) --- */
  { id: 'i-type-label', category: 'Type', level: 'INTERMEDIATE', title: 'Cabinet Label Printer',
    story: 'The Cabinet has a label printer for its shelves. It should print "Stars: 7", but it crashes. Fix the code and run it.',
    expect: 'Stars: 7', file: 'cabinet_labels.py', status: 'type_mismatch', badge: 'TYPE FAULT', bug: [1],
    needDef: 'make_label',
    probes: [{ fn: 'make_label', args: ['Moons', 3], expect: 'Moons: 3' }],
    code: 'def make_label(name, count):\n    return name + ": " + count\n\nprint(make_label("Stars", 7))',
    why: 'A string and an int cannot be joined with +. Convert the number with str(), or use an f-string.',
    hint: ['Read the error: which two types is Python trying to join?',
      'Convert the number first: str(count).'] },
  { id: 'i-type-thermo', category: 'Type', level: 'INTERMEDIATE', title: 'Cabinet Thermometer',
    story: 'The thermometer inside the Cabinet sends its reading as text, "4.5". The Cabinet should say "cold enough" below 5 degrees, but it crashes. Fix the code and run it.',
    expect: 'cold enough', file: 'cabinet_thermo.py', status: 'type_mismatch', badge: 'TYPE FAULT', bug: [2],
    variant: { re: '(reading\\s*=\\s*["\']?)4\\.5(["\']?)', to: '{1}7.5{2}', expect: 'too warm' },
    code: 'reading = "4.5"\nlimit = 5\nif reading < limit:\n    print("cold enough")\nelse:\n    print("too warm")',
    why: 'A string cannot be compared with a number using <. Convert it first with float(), because it has a decimal point.',
    hint: ['Which two types is the < comparing?',
      'Use float(reading) < limit. int() would fail on "4.5".'] },
  /* --- kettle (Recursion) --- */
  { id: 'i-recursion-factorial', category: 'Recursion', level: 'INTERMEDIATE', title: 'Pan Recipe Cipher',
    story: 'A recipe card under the Pan hides a number: 5 factorial (120), but the calculation never stops. Fix the code and run it.',
    expect: '120', file: 'pan_cipher.py', status: 'stack_overflow_risk', badge: 'RECURSION FAULT', bug: [1],
    needDef: 'factorial',
    probes: [{ fn: 'factorial', args: [4], expect: '24' }, { fn: 'factorial', args: [1], expect: '1' }],
    code: 'def factorial(n):\n    return n * factorial(n - 1)\n\nprint(factorial(5))',
    why: 'There was no base case. The function must stop and return 1 when n reaches 1.',
    hint: ['What should factorial(1) return? Does the code ever say so?',
      'Add before the return: if n <= 1: return 1'] },
  { id: 'i-recursion-cups', category: 'Recursion', level: 'INTERMEDIATE', title: 'Pan Cup Stack',
    story: 'Stacked cups sit next to the Pan. Adding 4 + 3 + 2 + 1 should print 10, but it prints something else. Fix the code and run it.',
    expect: '10', file: 'pan_cup_stack.py', status: 'wrong_output', badge: 'RECURSION FAULT', bug: [3],
    needDef: 'sum_cups',
    probes: [{ fn: 'sum_cups', args: [3], expect: '6' }],
    code: 'def sum_cups(n):\n    if n == 0:\n        return 0\n    n + sum_cups(n - 1)\n\nprint(sum_cups(4))',
    why: 'The recursive call computed the sum but never returned it, so the function gave back None. Keep the return in front of the call.',
    hint: ['What does a function give back when it reaches the end without a return?',
      'Put return in front: return n + sum_cups(n - 1).'] },
  /* --- clock (Scope) --- */
  { id: 'i-scope-total', category: 'Scope', level: 'INTERMEDIATE', title: 'Wall Clock Ticks',
    story: 'The Wall Clock tick counter adds 3 and then 4 to a running total, but the function crashes. Fix the code and run it.',
    expect: 'Total: 7', file: 'wallclock_ticks.py', status: 'scope_error', badge: 'SCOPE FAULT', bug: [3],
    variant: { re: 'add_ticks\\(3\\)', to: 'add_ticks(5)', expect: 'Total: 9' },
    code: 'total = 0\n\ndef add_ticks(n):\n    total = total + n\n\nadd_ticks(3)\nadd_ticks(4)\nprint("Total:", total)',
    why: 'Assigning to total inside the function makes it a new local variable. Declare global total, or return the new value.',
    hint: ['Python treats a name you assign inside a function as local to it. Which name is that here?',
      'Add global total as the first line of the function, or return the sum and store it outside.'] },
  { id: 'i-scope-chimes', category: 'Scope', level: 'INTERMEDIATE', title: 'Wall Clock Half-Day Chimes',
    story: 'After noon the Wall Clock should chime hour minus 12 times, and before noon the hour itself. At 9 it should print 9, but the function crashes. Fix the code and run it.',
    expect: '9', file: 'wallclock_chimes.py', status: 'scope_error', badge: 'SCOPE FAULT', bug: [3],
    needDef: 'ring',
    probes: [{ fn: 'ring', args: [15], expect: '3' }, { fn: 'ring', args: [9], expect: '9' }],
    code: 'def ring(hour):\n    if hour > 12:\n        chimes = hour - 12\n    return chimes\n\nprint(ring(9))',
    why: 'chimes is only created when hour is above 12. For 9 the branch is skipped, so the name does not exist yet when it is returned.',
    hint: ['Which hours create chimes? What happens for the others?',
      'Give chimes a value on every path: add else: chimes = hour.'] },

  /* ================= ADVANCED ================= */
  /* --- window (Index) --- */
  { id: 'a-index-pairs', category: 'Index', level: 'ADVANCED', title: 'TV Signal Neighbors',
    story: 'The TV signal scanner adds each reading to its neighbour. For [1, 2, 3, 4] it should give [3, 5, 7], but it crashes. Fix the code and run it.',
    expect: '[3, 5, 7]', file: 'tv_neighbors.py', status: 'index_out_of_range', badge: 'INDEX FAULT', bug: [3],
    needDef: 'pair_sums',
    probes: [{ fn: 'pair_sums', args: [[10, 20]], expect: '[30]' }, { fn: 'pair_sums', args: [[5, 5, 5]], expect: '[10, 10]' }],
    code: 'def pair_sums(nums):\n    sums = []\n    for i in range(len(nums)):\n        sums.append(nums[i] + nums[i + 1])\n    return sums\n\nprint(pair_sums([1, 2, 3, 4]))',
    why: 'nums[i + 1] does not exist for the last i. There are only len(nums) - 1 pairs.',
    hint: ['Which value of i makes nums[i + 1] fall off the end?',
      'Loop one time fewer: range(len(nums) - 1).'] },
  { id: 'a-index-panes', category: 'Index', level: 'ADVANCED', title: 'TV Screen Corners',
    story: 'The TV screen is a grid of tiles. The corner sum adds the four corner tiles. For a 3 by 3 grid of numbers it should give 20, but it crashes. Fix the code and run it.',
    expect: '20', file: 'tv_corners.py', status: 'index_out_of_range', badge: 'INDEX FAULT', bug: [1, 2],
    needDef: 'corner_sum',
    probes: [{ fn: 'corner_sum', args: [[[1, 2], [3, 4]]], expect: '10' }, { fn: 'corner_sum', args: [[[5]]], expect: '20' }],
    code: 'def corner_sum(grid):\n    last_row = len(grid)\n    last_col = len(grid[0])\n    return grid[0][0] + grid[0][last_col] + grid[last_row][0] + grid[last_row][last_col]\n\nprint(corner_sum([[1, 2, 3], [4, 5, 6], [7, 8, 9]]))',
    why: 'len() gives the count, but the last index is one less, for rows and for columns.',
    hint: ['A grid with 3 rows has row indexes 0, 1, 2. What is last_row set to?',
      'Subtract 1 from both: len(grid) - 1 and len(grid[0]) - 1.'] },
  /* --- fridge (Type) --- */
  { id: 'a-type-ledger', category: 'Type', level: 'ADVANCED', title: 'Green Box Receipt',
    story: 'Prices on the Green Box delivery receipt arrive as text, like "4". The ledger should still add them up to 10, but it crashes. Fix the code and run it.',
    expect: '10', file: 'greenbox_receipt.py', status: 'type_mismatch', badge: 'TYPE FAULT', bug: [3],
    needDef: 'total_price',
    probes: [{ fn: 'total_price', args: [{ a: '2', b: '3' }], expect: '5' }],
    code: 'def total_price(items):\n    total = 0\n    for name, price in items.items():\n        total += price\n    return total\n\nprices = {"tea": "4", "jam": "6"}\nprint(total_price(prices))',
    why: 'The prices are strings. Convert each one with int() before adding it to a number.',
    hint: ['Look at the values inside prices. What type are they?',
      'Add int(price) instead of price.'] },
  { id: 'a-type-stock', category: 'Type', level: 'ADVANCED', title: 'Green Box Inventory',
    story: 'The Green Box inventory counts come from two sources, so some are numbers and some are text. The total should be 15, but it crashes. Fix the code and run it.',
    expect: '15', file: 'greenbox_inventory.py', status: 'type_mismatch', badge: 'TYPE FAULT', bug: [3],
    needDef: 'total_items',
    probes: [{ fn: 'total_items', args: [{ a: '2', b: 3 }], expect: '5' }],
    code: 'def total_items(counts):\n    total = 0\n    for item in counts:\n        total += counts[item]\n    return total\n\nprint(total_items({"milk": 2, "eggs": "12", "jam": 1}))',
    why: 'One value is text, so adding it to a number fails. Converting every value with int() works for both kinds.',
    hint: ['Look at each value in the dictionary. Are they all the same type?',
      'Convert while adding: total += int(counts[item]).'] },
  /* --- kettle (Recursion) --- */
  { id: 'a-recursion-vault', category: 'Recursion', level: 'ADVANCED', title: 'Roomba Route Search',
    story: 'The Roomba keeps a sorted list of routes and searches it by halving. Looking for 10 should give position 4, but the search never ends. Fix the code and run it.',
    expect: '4', file: 'roomba_route_search.py', status: 'stack_overflow_risk', badge: 'RECURSION FAULT', bug: [7],
    needDef: 'find',
    probes: [{ fn: 'find', args: [[1, 3, 5, 7], 7, 0, 3], expect: '3' }, { fn: 'find', args: [[1, 3, 5, 7], 4, 0, 3], expect: '-1' }],
    code: 'def find(items, target, low, high):\n    if low > high:\n        return -1\n    mid = (low + high) // 2\n    if items[mid] == target:\n        return mid\n    if items[mid] < target:\n        return find(items, target, mid, high)\n    return find(items, target, low, mid - 1)\n\nprint(find([2, 4, 6, 8, 10], 10, 0, 4))',
    why: 'When mid is too small, the next search must start after it (mid + 1). Starting at mid repeats the same range forever.',
    hint: ['Trace find(..., 3, 4) by hand. What is mid, and what range comes next?',
      'In the "too small" branch use low = mid + 1.'] },
  { id: 'a-recursion-leaves', category: 'Recursion', level: 'ADVANCED', title: 'Roomba Dust Boxes',
    story: 'The Roomba empties dust boxes that can hold numbers or smaller boxes (lists). Adding [1, [2, 3], [4, [5]]] should give 15, but it crashes. Fix the code and run it.',
    expect: '15', file: 'roomba_dust_boxes.py', status: 'type_mismatch', badge: 'RECURSION FAULT', bug: [3],
    needDef: 'total_leaves',
    probes: [{ fn: 'total_leaves', args: [[[1], [2, [3]]]], expect: '6' }, { fn: 'total_leaves', args: [[]], expect: '0' }],
    code: 'def total_leaves(box):\n    total = 0\n    for item in box:\n        total += total_leaves(item)\n    return total\n\nprint(total_leaves([1, [2, 3], [4, [5]]]))',
    why: 'The function called itself on plain numbers too, but a number is not a box. A number is the base case: add it. A list is the recursive case.',
    hint: ['What happens when item is the number 1 and the function loops over it?',
      'Check the type: if isinstance(item, list): recurse, else add item.'] },
  /* --- clock (Scope) --- */
  { id: 'a-scope-jar', category: 'Scope', level: 'ADVANCED', title: 'Laptop Alarm Memory',
    story: 'Each call should make a fresh alarm list for the Laptop. The second call should print [\'09:00\'] but it remembers the first alarm. Fix the code and run it.',
    expect: '[\'07:00\']\n[\'09:00\']', file: 'laptop_alarm_memory.py', status: 'shared_state', badge: 'SCOPE FAULT', bug: [0],
    needDef: 'add_alarm',
    probes: [{ fn: 'add_alarm', args: ['06:30'], expect: '[\'06:30\']' }],
    code: 'def add_alarm(alarm, alarms=[]):\n    alarms.append(alarm)\n    return alarms\n\nprint(add_alarm("07:00"))\nprint(add_alarm("09:00"))',
    why: 'A default list is created once and shared by every call. Use None as the default and make a new list inside the function.',
    hint: ['The list alarms=[] is made only one time. Who shares it?',
      'Use alarms=None, then: if alarms is None: alarms = []'] },
  { id: 'a-scope-hands', category: 'Scope', level: 'ADVANCED', title: 'Laptop Clock Hands',
    story: 'The clock widget on the Laptop gives each hand its own number, so the program should print [0, 1, 2]. Instead every hand shows the same number. Fix the code and run it.',
    expect: '[0, 1, 2]', file: 'laptop_clock_hands.py', status: 'shared_state', badge: 'SCOPE FAULT', bug: [2],
    variant: { re: 'range\\(3\\)', to: 'range(2)', expect: '[0, 1]' },
    code: 'hands = []\nfor h in range(3):\n    hands.append(lambda: h)\nprint([f() for f in hands])',
    why: 'Every lambda looks up h when it is called, after the loop has finished, so they all see the last value. Give each lambda its own copy: lambda h=h: h.',
    hint: ['When does each lambda read h: while the loop runs, or after it ends?',
      'Capture the value now with a default argument: lambda h=h: h.'] }
];

// regex + replacement used by the "same code, other data" hidden check
function applyVariant(code, v) {
  const re = new RegExp(v.re);
  return code.replace(re, (...m) => v.to.replace(/\{(\d)\}/g, (_, i) => m[+i] ?? ''));
}

// JSON -> Python source (JSON true/false/null are not valid Python), used to build probe calls
function pyLiteral(v) {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(pyLiteral).join(', ') + ']';
  return '{' + Object.keys(v).map((k) => JSON.stringify(k) + ': ' + pyLiteral(v[k])).join(', ') + '}';
}

// node test runner and tools/verify_bank.py can load this file; browsers ignore it
if (typeof module !== 'undefined') module.exports = { CATEGORIES, MISTAKE_CATEGORIES, SPOT_CATEGORY, LEVELS, TAG_CATEGORY, categoryOfTag, PUZZLE_BANK, applyVariant, pyLiteral };