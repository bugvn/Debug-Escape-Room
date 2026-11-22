// PUZZLE BANK + category map. Plain data, no page code, so game-room.html, tests and
// tools/verify_bank.py all read the same file.
//
// One puzzle per (category x level) cell. Add more puzzles = add more objects. The game
// picks 4 per room (see adaptive.js). Nothing else needs to change.
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

const CATEGORIES = ['Index', 'Type', 'Recursion', 'Scope', 'Syntax', 'Logic'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

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
  /* ---------------- BEGINNER ---------------- */
  { id: 'b-index-stars', category: 'Index', level: 'BEGINNER', title: 'Star Matrix',
    story: 'The star matrix should add up the brightness of five stars, but the program crashes. Fix the code and run it.',
    expect: '14', file: 'star_matrix.py', status: 'index_out_of_range', badge: 'INDEX FAULT', bug: [2],
    variant: { re: '\\[3,\\s*1,\\s*4,\\s*1,\\s*5\\]', to: '[2, 7, 1, 8]', expect: '18' },
    code: 'stars = [3, 1, 4, 1, 5]\ntotal = 0\nfor i in range(len(stars) + 1):\n    total += stars[i]\nprint(total)',
    why: 'The loop went one index too far. A list of 5 items has valid indexes 0 to 4.',
    hint: ['Count the stars: 5. Now count how many times the loop runs. Do they match?',
      'range(len(stars) + 1) runs 6 times. Drop the + 1, or loop with for s in stars.'] },
  { id: 'b-type-lock', category: 'Type', level: 'BEGINNER', title: 'Code Lock',
    story: 'The lock needs the digit that comes after 7. Fix the code and run it.',
    expect: 'Lock code: 8', file: 'code_lock.py', status: 'type_mismatch', badge: 'TYPE FAULT', bug: [1],
    variant: { re: '(digit\\s*=\\s*["\']?)7(["\']?)', to: '{1}4{2}', expect: 'Lock code: 5' },
    code: 'digit = "7"\ncode = digit + 1\nprint("Lock code:", code)',
    why: '"7" is a string. It must be converted with int() before a number can be added to it.',
    hint: ['Look at the quotes around 7. What type does that make it?',
      'Convert it first: int(digit) + 1. Or remove the quotes around 7.'] },
  { id: 'b-recursion-kettle', category: 'Recursion', level: 'BEGINNER', title: 'Recursive Kettle Loop',
    story: 'A kettle is boiling infinitely and tripping the containment seal. The heating routine should stop once the target is reached, but it crashes. Fix the code and run it.',
    expect: 'kettle_ready: safe_to_pour', file: 'kettle_controller.py', status: 'stack_overflow_risk', badge: 'RECURSION FAULT', bug: [3],
    needDef: 'heat_water',
    probes: [{ fn: 'heat_water', args: [55, 100, 0], expect: 'kettle_ready: safe_to_pour' }],
    code: 'def heat_water(current_temp, target_temp, cycle):\n    if current_temp >= target_temp:\n        return "kettle_ready: safe_to_pour"\n    return heat_water(current_temp, target_temp, cycle + 1)\n\nprint(heat_water(20, 100, 0))',
    why: 'current_temp never changes, so it never reaches target_temp and the recursion never stops. Each call must move the temperature forward.',
    hint: ['Does current_temp ever get bigger from one call to the next?',
      'Heat it up on every call: heat_water(current_temp + 10, target_temp, cycle + 1).'] },
  { id: 'b-scope-clock', category: 'Scope', level: 'BEGINNER', title: 'Chime Counter',
    story: 'At 15:00 the clock should chime 3 times, but the program crashes. Fix the code and run it.',
    expect: 'Chimes: 3', file: 'chime_counter.py', status: 'scope_error', badge: 'SCOPE FAULT', bug: [4, 5],
    needDef: 'ring_hours', needCall: 'ring_hours',
    probes: [{ fn: 'ring_hours', args: [9], expect: '9' }],
    code: 'def ring_hours(hour):\n    chimes = hour % 12\n    return chimes\n\nring_hours(15)\nprint("Chimes:", chimes)',
    why: 'chimes only exists inside the function. Store the returned value in a variable outside it.',
    hint: ['Where does chimes live? Can code outside the function see it?',
      'ring_hours(15) returns a value but nothing catches it. Store it: chimes = ring_hours(15).'] },
  { id: 'b-syntax-bowls', category: 'Syntax', level: 'BEGINNER', title: 'Feeding Bowls',
    story: 'The pet feeder should add up the treats in three bowls, but the program will not even start. Fix the code and run it.',
    expect: 'Treats: 10', file: 'feeder.py', status: 'syntax_error', badge: 'SYNTAX FAULT', bug: [2],
    variant: { re: 'bowls\\s*=\\s*\\[2,\\s*3,\\s*5\\]', to: 'bowls = [4, 4]', expect: 'Treats: 8' },
    code: 'bowls = [2, 3, 5]\ntotal = 0\nfor b in bowls\n    total += b\nprint("Treats:", total)',
    why: 'A for statement must end with a colon. Without it Python cannot read the line.',
    hint: ['Python reports a SyntaxError before running anything. Look at the end of the for line.',
      'Every for statement ends with a colon: for b in bowls:'] },
  { id: 'b-logic-thermostat', category: 'Logic', level: 'BEGINNER', title: 'Thermostat',
    story: 'At 25 degrees or higher the room counts as warm. The thermostat says "cool" at exactly 25. Fix the code and run it.',
    expect: 'warm', file: 'thermostat.py', status: 'wrong_output', badge: 'LOGIC FAULT', bug: [1],
    needDef: 'is_warm',
    probes: [{ fn: 'is_warm', args: [10], expect: 'cool' }, { fn: 'is_warm', args: [25], expect: 'warm' }],
    code: 'def is_warm(temp):\n    if temp > 25:\n        return "warm"\n    return "cool"\n\nprint(is_warm(25))',
    why: '> leaves out 25 itself. "25 or higher" needs >=.',
    hint: ['Test the exact border value by hand: what does 25 > 25 give?',
      'Use >= so that 25 counts as warm.'] },

  /* ---------------- INTERMEDIATE ---------------- */
  { id: 'i-index-shelf', category: 'Index', level: 'INTERMEDIATE', title: 'Pantry Shelf',
    story: 'The pantry shelf counter should add up every jar, but the while loop crashes. Fix the code and run it.',
    expect: '30', file: 'pantry_shelf.py', status: 'index_out_of_range', badge: 'INDEX FAULT', bug: [3],
    variant: { re: 'shelf\\s*=\\s*\\[3,\\s*6,\\s*9,\\s*12\\]', to: 'shelf = [1, 2, 3]', expect: '6' },
    code: 'shelf = [3, 6, 9, 12]\ni = 0\ntotal = 0\nwhile i <= len(shelf):\n    total += shelf[i]\n    i += 1\nprint(total)',
    why: 'The last valid index is len(shelf) - 1. Using <= lets i reach len(shelf), which does not exist.',
    hint: ['The loop runs while i <= 4. How many items does shelf have?',
      'Change <= to <, so i stops at the last index.'] },
  { id: 'i-type-label', category: 'Type', level: 'INTERMEDIATE', title: 'Label Printer',
    story: 'The label printer should print "Stars: 7", but it crashes. Fix the code and run it.',
    expect: 'Stars: 7', file: 'label_printer.py', status: 'type_mismatch', badge: 'TYPE FAULT', bug: [1],
    needDef: 'make_label',
    probes: [{ fn: 'make_label', args: ['Moons', 3], expect: 'Moons: 3' }],
    code: 'def make_label(name, count):\n    return name + ": " + count\n\nprint(make_label("Stars", 7))',
    why: 'A string and an int cannot be joined with +. Convert the number with str(), or use an f-string.',
    hint: ['Read the error: which two types is Python trying to join?',
      'Convert the number first: str(count).'] },
  { id: 'i-recursion-factorial', category: 'Recursion', level: 'INTERMEDIATE', title: 'Endless Factorial',
    story: 'The vault code is 5 factorial (120), but the calculation never stops. Fix the code and run it.',
    expect: '120', file: 'vault_math.py', status: 'stack_overflow_risk', badge: 'RECURSION FAULT', bug: [1],
    needDef: 'factorial',
    probes: [{ fn: 'factorial', args: [4], expect: '24' }, { fn: 'factorial', args: [1], expect: '1' }],
    code: 'def factorial(n):\n    return n * factorial(n - 1)\n\nprint(factorial(5))',
    why: 'There was no base case. The function must stop and return 1 when n reaches 1.',
    hint: ['What should factorial(1) return? Does the code ever say so?',
      'Add before the return: if n <= 1: return 1'] },
  { id: 'i-scope-total', category: 'Scope', level: 'INTERMEDIATE', title: 'Star Counter',
    story: 'The star counter adds 3 and then 4 to a running total, but the function crashes. Fix the code and run it.',
    expect: 'Total: 7', file: 'star_counter.py', status: 'scope_error', badge: 'SCOPE FAULT', bug: [3],
    variant: { re: 'add_stars\\(3\\)', to: 'add_stars(5)', expect: 'Total: 9' },
    code: 'total = 0\n\ndef add_stars(n):\n    total = total + n\n\nadd_stars(3)\nadd_stars(4)\nprint("Total:", total)',
    why: 'Assigning to total inside the function makes it a new local variable. Declare global total, or return the new value.',
    hint: ['Python treats a name you assign inside a function as local to it. Which name is that here?',
      'Add global total as the first line of the function, or return the sum and store it outside.'] },
  { id: 'i-syntax-greeter', category: 'Syntax', level: 'INTERMEDIATE', title: 'Door Greeter',
    story: 'The door greeter should welcome a visitor by name, but the program will not start. Fix the code and run it.',
    expect: 'Welcome home, Luna', file: 'door_greeter.py', status: 'syntax_error', badge: 'SYNTAX FAULT', bug: [1],
    needDef: 'welcome',
    probes: [{ fn: 'welcome', args: ['Mochi'], expect: 'Welcome home, Mochi' }],
    code: 'def welcome(name):\n    message = ("Welcome home, " + name\n    return message\n\nprint(welcome("Luna"))',
    why: 'A bracket was opened but never closed. Every ( needs a matching ).',
    hint: ['Python complains about something that was never closed. Check the brackets line by line.',
      'Close the bracket after name, or remove the brackets completely.'] },
  { id: 'i-logic-door', category: 'Logic', level: 'INTERMEDIATE', title: 'Door Check',
    story: 'The exit opens only with the key AND the right code. Right now the door opens with the key alone. Fix the code and run it.',
    expect: 'locked', file: 'door_check.py', status: 'wrong_output', badge: 'LOGIC FAULT', bug: [1],
    needDef: 'can_open',
    probes: [{ fn: 'can_open', args: [true, 1234], expect: 'open' }, { fn: 'can_open', args: [false, 1234], expect: 'locked' }, { fn: 'can_open', args: [true, 0], expect: 'locked' }],
    code: 'def can_open(has_key, code):\n    if has_key or code == 1234:\n        return "open"\n    return "locked"\n\nprint(can_open(True, 0))',
    why: '"or" is true when either side is true. The door needs both, so use "and".',
    hint: ['Say the rule in words: key AND code. Which Python word is that?',
      'Replace or with and.'] },

  /* ---------------- ADVANCED ---------------- */
  { id: 'a-index-pairs', category: 'Index', level: 'ADVANCED', title: 'Neighbor Sums',
    story: 'The star scanner adds each star to its neighbour. For [1, 2, 3, 4] it should give [3, 5, 7], but it crashes. Fix the code and run it.',
    expect: '[3, 5, 7]', file: 'neighbor_sums.py', status: 'index_out_of_range', badge: 'INDEX FAULT', bug: [3],
    needDef: 'pair_sums',
    probes: [{ fn: 'pair_sums', args: [[10, 20]], expect: '[30]' }, { fn: 'pair_sums', args: [[5, 5, 5]], expect: '[10, 10]' }],
    code: 'def pair_sums(nums):\n    sums = []\n    for i in range(len(nums)):\n        sums.append(nums[i] + nums[i + 1])\n    return sums\n\nprint(pair_sums([1, 2, 3, 4]))',
    why: 'nums[i + 1] does not exist for the last i. There are only len(nums) - 1 pairs.',
    hint: ['Which value of i makes nums[i + 1] fall off the end?',
      'Loop one time fewer: range(len(nums) - 1).'] },
  { id: 'a-type-ledger', category: 'Type', level: 'ADVANCED', title: 'Shop Ledger',
    story: 'Prices arrive from the shop feed as text, like "4". The ledger should still add them up to 10, but it crashes. Fix the code and run it.',
    expect: '10', file: 'shop_ledger.py', status: 'type_mismatch', badge: 'TYPE FAULT', bug: [3],
    needDef: 'total_price',
    probes: [{ fn: 'total_price', args: [{ a: '2', b: '3' }], expect: '5' }],
    code: 'def total_price(items):\n    total = 0\n    for name, price in items.items():\n        total += price\n    return total\n\nprices = {"tea": "4", "jam": "6"}\nprint(total_price(prices))',
    why: 'The prices are strings. Convert each one with int() before adding it to a number.',
    hint: ['Look at the values inside prices. What type are they?',
      'Add int(price) instead of price.'] },
  { id: 'a-recursion-vault', category: 'Recursion', level: 'ADVANCED', title: 'Binary Vault',
    story: 'The vault searches a sorted list by halving it. Looking for 10 should give position 4, but the search never ends. Fix the code and run it.',
    expect: '4', file: 'binary_vault.py', status: 'stack_overflow_risk', badge: 'RECURSION FAULT', bug: [7],
    needDef: 'find',
    probes: [{ fn: 'find', args: [[1, 3, 5, 7], 7, 0, 3], expect: '3' }, { fn: 'find', args: [[1, 3, 5, 7], 4, 0, 3], expect: '-1' }],
    code: 'def find(items, target, low, high):\n    if low > high:\n        return -1\n    mid = (low + high) // 2\n    if items[mid] == target:\n        return mid\n    if items[mid] < target:\n        return find(items, target, mid, high)\n    return find(items, target, low, mid - 1)\n\nprint(find([2, 4, 6, 8, 10], 10, 0, 4))',
    why: 'When mid is too small, the next search must start after it (mid + 1). Starting at mid repeats the same range forever.',
    hint: ['Trace find(..., 3, 4) by hand. What is mid, and what range comes next?',
      'In the "too small" branch use low = mid + 1.'] },
  { id: 'a-scope-jar', category: 'Scope', level: 'ADVANCED', title: 'Wish Jar',
    story: 'Each call should make a fresh wish list. The second call should print [\'sun\'] but it remembers the first wish. Fix the code and run it.',
    expect: '[\'moon\']\n[\'sun\']', file: 'wish_jar.py', status: 'shared_state', badge: 'SCOPE FAULT', bug: [0],
    needDef: 'add_wish',
    probes: [{ fn: 'add_wish', args: ['star'], expect: '[\'star\']' }],
    code: 'def add_wish(wish, wishes=[]):\n    wishes.append(wish)\n    return wishes\n\nprint(add_wish("moon"))\nprint(add_wish("sun"))',
    why: 'A default list is created once and shared by every call. Use None as the default and make a new list inside the function.',
    hint: ['The list wishes=[] is made only one time. Who shares it?',
      'Use wishes=None, then: if wishes is None: wishes = []'] },
  { id: 'a-syntax-countdown', category: 'Syntax', level: 'ADVANCED', title: 'Countdown Panel',
    story: 'The launch panel should count 3, 2, 1 and then print Liftoff!, but the program will not start. Fix the code and run it.',
    expect: '3\n2\n1\nLiftoff!', file: 'countdown_panel.py', status: 'syntax_error', badge: 'SYNTAX FAULT', bug: [3],
    variant: { re: 'launch\\(3\\)', to: 'launch(2)', expect: '2\n1\nLiftoff!' },
    code: 'def launch(count):\n    for i in range(count, 0, -1):\n        print(i)\n     print("Liftoff!")\n\nlaunch(3)',
    why: 'Lines in the same block must start at the same column. The last print is one space off, so Python cannot match it to any block.',
    hint: ['Compare how far each line inside launch is pushed in from the left.',
      'Align print("Liftoff!") with the for line (4 spaces) so it runs once after the loop.'] },
  { id: 'a-logic-bright', category: 'Logic', level: 'ADVANCED', title: 'Bright Finder',
    story: 'The finder should return the first star brighter than the limit. For [2, 3, 9, 5] and limit 4 it should give 9, but it gives something else. Fix the code and run it.',
    expect: '9', file: 'bright_finder.py', status: 'wrong_output', badge: 'LOGIC FAULT', bug: [4, 5],
    needDef: 'first_bright',
    probes: [{ fn: 'first_bright', args: [[1, 2], 5], expect: 'None' }, { fn: 'first_bright', args: [[1, 7, 9], 5], expect: '7' }],
    code: 'def first_bright(stars, limit):\n    for s in stars:\n        if s > limit:\n            return s\n        else:\n            return None\n\nprint(first_bright([2, 3, 9, 5], 4))',
    why: 'The else branch returns on the very first star, so the loop never reaches the others. Only give up after the whole loop ends.',
    hint: ['How many stars does the loop look at before the function returns?',
      'Remove the else, and put return None after the loop (not inside it).'] }
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
if (typeof module !== 'undefined') module.exports = { CATEGORIES, LEVELS, TAG_CATEGORY, categoryOfTag, PUZZLE_BANK, applyVariant, pyLiteral };