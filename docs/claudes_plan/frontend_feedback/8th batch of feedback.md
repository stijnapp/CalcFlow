by default, none of the chapters should be selected. instead of the random bunch that are currently selected on first visit

the .svg logo has round corners, but the .png ones have squared off corners. i want the .png's to also have those rounded off corners

get rid of the "word problems" dead toggle

"works offline, and no address bar" text is kinds corny. just make the text make clear that it will install as a PWA and that it'll remain functional even if offline

currently, all latex inputs have the dark background and the yellow (primary color) border, but i only want the border to show on the input that i have focussed. otherwise, dont use yellow as border so its easy to see which is focussed

on the "rules to know by heart" page, i want to be able to click on a rule which opens a modal that shows an example, and i can click on a refresh/randomise button to generate a new example that demonstrates that exact rule (so, it fills in the variables to make it clear what happens with each value).

when entering latex mode in the canvas, i want that bottom bar input to animate in/out from the bottom instead of popping into existance

dont focus on the latex input field at the bottom when tapping a floating latex box in the canvas. (it interferes with when i tap it to see the latex (where it correctly doesnt focus the input), but if i then start to drag it, focus is put on the input while i'm holding it causing it to shoot down because the page shoots up to make room for the keyboard.) the only way to focus the latex box at the bottom of the page is to click that box, just like with the other inputs

The app seems to always open on the practice page instead of home. i want it to open to the home page (unless this is just me closing the app on the practice page? idk maybe it's just my own doing) - ooooh nevermind, i see that when i close it and open it, that it continues where i left off. i closed it with 1 wrong and 1 right and at the 3rd question, and it opens there again even with the same half-typed answer i have. the only thing is that it doesn't restore the canvas, so i lose all my drawings and latex inside the canvas...

The canvas gets cleared on mobile whenever i toggle the full canvas on or off (in both cases it get's cleared)

i want the option to undo/redo in latex inputs by tapping the latex preview section with 2/3 fingers (just like tapping with 2/3 fingers for undoing/redoing drawings)

Keyboard shows up when focus is pulled to a latex input, but the input doesnt scroll all the way down, against the top of the keyboard. instead the page still shows the confidence buttons, which take up valuable space because that way i can see less of my notes while typing the answer. So the input should be at the bottom of the viewport (i think that's what it's called?) on focus, so that I get maximum real estate to see notes while typing.

Closing and opening the hint menu clears the "am in on track" input

hover only works on right half of each individual toolbar button? also some more hover notes:
- there is currently no delay for showing the hover text. it instantly shows (well, technically the animation starts instantly, but i mean that it's triggered instantly instead of ~half a second)
- hover text from the toolbar should appear to the right of the button and centered vertically
- for the notation bar buttons the popup should be above and centered horizontaly

Also show tooltips on:
- chapter pills in "rules knowing by heart" screen
- sync button on homescreen. this should show amount queued and last sync.

also, i want to be able to toggle multiple chapter pills in the rules page at the same time, and when i tap the last toggled on chapter pill to turn it off (and therefore have no more specific chapters selected), it should automatically select the "all" pill again

also, i want a loop tool to select text and then move it. when the tool is selected, i can draw a shape freely, and when i let go, the current position closes to the start so the shape is whole. then, any line that is either fully inside or even has the smallest part inside that shape, should get selected and a box is put around the whole selection. then, i can drag that selection around.
- I also see that the phone screen's tool bar is basically full. My solution is to make the tools horizontally scrollable. however, only the tools should be scrollable, because the hand/pen button and the fullscreen button should always be directly accessible and should remain in their current places in the minified mode, and in the fullscreen mode the "exit fullscreen" button is already out of the way, but the hand button is in the toolbar. i want that hand bar to show on the left of the "exit fullscreen" button on top of the screen when in fullscreen mode.

i want to be able to easily switch the order of the notation row buttons by holding it down for half a second, and then it becomes free floating (so i can move it around wherever on my screen) but there is a ghost version of that button that will show up in the place that the button will end up if i let go. when that ghost button moves, all surrounding buttons animate smoothly to accomodate it.

also, when i delete a custom notation button, i want it's values to pop into the inputs (just in case it was a mistake. and as a bonus, this is an easy way to implement editing the key face/types)

i want to be able to scroll up a bit past the most upper drawings. i dont want to scroll up infinitely (like how scrolling down is infinite) but only a tiny bit. this is so i can scroll to the top of the canvas when the keybaord is open to type the answer. (currently when the keyboard is open, the whole page (including the canvas) shifts up so i cant see it anymore). it would be fixed when i can scroll half the canvas height past the top most drawing (that would be enough both on phone and tablet).

when answering derivatives, it currently expects the raw derivative, but i also want it to accept the Prime Notation (Lagrange) ( f'(x)=18x^2 ) and the Leibniz Notation (with a check on if the right \frac{dy}{dx} vs \frac{d}{dx} was used) and Euler's Operator Notation (with D(6x^3)=18x and D_x(6x^3)=18x valid options)

im still not completely happy with the hints. for example: f(x)=e^{x+3} gives the hints 1.chain rule, 2. cain rule applied, 3. full sollution (which is just e^{x+3}). But then in the "rules this used" section after submitting, it also shows the "standard derivatives" rule, which would be MUCH more helpful. so i want all rules used in a problem to be listed in the hints. not just 1 pick.

when i get an answer wrong, i want a button at the bottom of the steps that you see when pressing "see the steps" in the red area. that button should say "copy for claude" or soething similar, with the claude logo. that will then copy text to the clipboard, similar to "i have this problem `differentiate ... give f'x in the exact fully simplified form` and this answer `some stupid answer with a tiny mistake that lead me to become very confused`. explain to me where i went wrong. explain every step of the process" or something similar (and with the raw latex in those 2 spots). then i can paste that into claude chat myself and continue the lesson there, so i can ask direct questions etc.
- (ooh, maybe also add a hover effect with something like "copy the question and answer to the clipboard to ask claude yourself" or something)

the level slider has more margin than the other components on the homescreen. normalize that. (it's not important enough to deserve the extra margin. it's already taking quite some space, which is indication enough that it's an important slider i think)

the "ready to practice" on the homescreen on mobile looks kind of odd, because it forces the buttons like stats and settings to shove 1 row down... maybe put a shorter text there? (and also use that same text on tablet. no need to have seperate texts here)