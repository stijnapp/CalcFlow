when sliding the level slider but not letting go, the current actual value's little gray dot disapears. it should stay visible.

the homescreen doesnt fit on tablet. this should be fixed by making the mode 'select/adaptive dificulty/start button' section full height, with the level selector left of it (instead of the level selector above it). that should fix it.

the whole streak functionality can be removed

the notation keyboard should be placed above the answer input, given that the input is focussed when the on-device keyboard is opened, which causes the notation keyboard to not be visible
- also, the icons on the keyboard aren't rendering properly, like the division with just 2 boxes, the root with a box, a box^n, etc.
- actually, move the notation buttons to within the input, so within the input element it's the scrollable row of notation buttons, then the latex preview, then the raw latex. that way, it looks cleaner, and also each input than has it's own notation buttons which solves the problem for where they go if you have 2 inputs (like with the "smaller x, larger x" problems). also replace the latex input within the canvas with this same mechanism.
- and currently it's kinda hard to focus the raw latex input to begin typing, so i also want to set the focus to that input when i click on the latex preview text.
- also replace the "am i still on track" input with this new element

about the latex option in the canvas: while that mode is active and there IS text in the active input, deselect that display. when i click on the canvas and ther ISNT text in the input, i want a new display placed there, and to focus the input so the keyboard comes up.

i want the canvas to have some momentum, so that if i have a long notation, i can quickly scroll to the begin/end.

the answer area on mobile goes down a little too much, making it hard to reach (it interferes with android's bar that when swiped up will go to the homescreen...). it should be 1.5x to 2x higher
- and when that area is down, i can just barely see the bottom of the canvas. so make sure that the canvas ends earlyer, so that it ends just before the height at which the answer area begins in it lowered form.
- also, i noticed that the hint menu uses the same styling as the answer area (with that little bar that looks like it can be dragged), only this modal IS closeable. i'd like to make this type of modal more generic, by adding the option to drag it higher so it snaps almost to the top of the screen, and an option to drag it all the way down, in which case it depends on if it's closeable: if it IS closeable (like the hint popup), it should just close/disapear off screen. if it's NOT closeable (like the answer area), it should just be that bar that sticks out of the bottom of the screen, like i described before (i mean that bar that i pointed out should be a little bit higher)

the mobile view misses the clear canvas button when in the normal mode, and it misses the pen/finger drawing button when in fullscreen mode. make sure both these modes get these buttons

there is a problem with the modals for clearing the canvas and showing the hints, both on mobile and on tablet:
- pressing clear canvas shows the modal for a split second and then closes it. i havent found any way to keep it from closing. it should just stay open untill i close it deliberately.
- pressing the show hint button pops the hint out for about a centimeter, and then closes it again... Though here i found a workaround that if you press the button again quickly while the hint element is still existing (so hasnt finished the fading out animation) that it will actually open?? ofcourse this should just happen the first time i click it.
- also, when the hints menu is opened (with that workaround) and i press the "open the rule card" text, that successfully opens, but when i close that card by any means, the hints menu ALSO closes...

the hint menu button on tabled should also just be a pill, exactly like on mobile. and then the pill with "ch 8 - equasions" can be removed on both devices so both devices can also show the progress of the 10 questions (those 10 gray/green/red dots)

some hints for easy problems are not making sense, for example with (x=5)^2 :
1. which rule -> shows notable products, and the (a+b)(a-b)=a^2-b^2 (which i dont think is right? though im not sure, this is exactly why i need this app haha). then the rule card shows (a\pm b)^2 = a^2\pm 2ab+b^2 (which is think IS correct)
2. set it up -> shows "square the first, twice the product, square the last" and then the equasion: x^2+10x+25 (which is fine as it is)
3. next step -> "square the first, twice the product, square the last", which is the exact same text as hint nr2, so this is useless
4. full solution -> x^2+10x+25 (which again is the same thing as in step 2, though here i can accept it's the same because the solution is what it is.)
But then there are also very hard problems with many steps, and they still get these same 4 hints. so i'd like the amount of hints to be somewhat corresponding to the level of the question

the "open the rule card" modal that you open from the hints menu has too much text in the modal title. remove the yellow "rule card" text

I want there to be just 1 pen option (instead of a thick and a thin one), and clicking on it while it's active should show a slider for the width, with a little preview of a small line that will be the currently selected width to show if it's a good width (just like how that's handled in the samsung notes app)

for the notation row settings:
- the animations are quite ambitious... i do like the swooshing from the selected to the deselected areas, but right now ALL elements fly down. so even when clicking a gray element to add it to the bar, it flys down (which should go up). also, it flies very far, so i'd like the cutoff to be shorter (basically, make it fly about 1/4 the length it currently does, that should make it better). 
- i also want 2 side-by-side inputs added at the bottom of this notation row section, where i can add custom notations. the first input is for the icon that'll be displayed in the button, and the second input is for the raw latex it represents.

dragging a toast to either side should dismiss it.

the "clear history" button should also have a warning popup, but this one should have a confirmation where you have to type something to be able to do it. also, i want this to be rebranded to clear the local changes only. so only the unsynced changes are removed.
- also add a button with only the green sync icon left of the settings button on the home screen when there is data to be synced. this button does the same action as the big button at the bottom of the settings page

and the button to go back to the menu should also display a warning that the current progress and notes will be lost.