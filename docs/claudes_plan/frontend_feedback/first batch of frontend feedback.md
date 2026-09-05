There should be a lot more animations. especially exit animations (which are likely not working because the element is removed before the animation plays). use react motion for all animations. that will make it very easy to add them.
  - also, page transitions should animate
  - the hint menu on tablet should fly in from the right instead of bottom

i also want to be able to use the device's back buttons, which means there needs to be browser navigation with probably react router or something. because currently, using the back button will just close the browser/app...
- also, leaving the app and coming back some time later on the phone looks like it refreshes something and then sends me back to the homescreen of the app... even though i was in the middle of solving a problem.

the math keyboard is leaving much to be desired... i think we should just get rid of it, and instead just have a text input for plain latex. then we'll just leave 1 row with common operations with long latex notation like fraction, root, derivative, etc. And when i press one of those buttons, the exact latex (eg. \frac{}{}) will be inserted. also 2 buttons for moving the cursor left/right
- oooh, and in the settings menu you can then customise it, by adding/removing buttons
- also remove the "backspace" button to the right of the input

in the main menu, i think we should switch places between the chapters and the sliders. that way, the slider is the full width of the page, and the chapters will fit more nicely to the left of the mode selector stuff. also, the steps slider can be removed, as i dont see any benefit anymore of having it since it's basically the same as ramping up the difficulty. therefore, only the difficulty slider should remain and this should incorporate (in the generation logic) that more difficulty will also mean more steps. and, to make the app more future proof, make the slider steps increasingly bigger. for example: 1, 2, 3, 5, 7, 10, 15, 20, 30 or something? also, the dot on the slider is correctly animated, but the line beneath it just jumps straight to the selected point without animation. another thing i'd prefer with the slider, is that the dot (and also the line beneath it) should not snap to any step untill i release. to be clear, while dragging, the number on the right of the bar should actually display the "current" value (so the value that the point will land on once let go in the current position).

toasts should be displayed for longer, like 3x the current time.

move the latex button in the tab editor to directly below the eraser button. and remove the "tex" text below it
- also remove the "pen" text from the pen/finger draw button

on the rules to know by heart screen on phone display, make the chapter selector only 1 row, which will scroll in the x direction

scrollable windows should have some extra space at the bottom. so when i scroll to the bottom, the last element is not directly against the bottom of the screen but has some margin below

the scrollbar in the canvas is lagging behing a little. i think you put a transition on it? also, i want to be able to scroll infinitely down from the start, not only when there's drawings towards the bottom. what i have in mind is that the scrollable bar is like 2/3 of the total height at the start (so the canvas starts at 4/3 the height), but when you scroll down you'll just be able to scroll infinitely and the scrollbar will resize accordingly. and then when i scroll back up, the scrollbar will resize back untill the canvas is the actual size of the drawings again (that 4/3). which is kind of the same idea as scrolling in excel, now that i think about it

for some cleanup, some texts and such can be removed, as they really serve no purpose:
- remove "nine chapters live. every problem is generated on-device"
- remove the "n selected" counter on the homescreen
- the text behind steps and difficulty (thoug the whole steps slider will be deleted, so that's taken care of), so the "how ugly the numbers get"
- in the "where you stand" page, remove the bottom text that sais "median time per problem......not an outside benchmark"
- remove "tap a line to place - enter commits" text

on phone, some latex displays are rather large, with big margins on either side, causing the text to wrap. i'd prefer less wrapping by decreasing the text size and margins. for example in the chain rule modal when opening it from the hint section.

also, the hint section "reveal ..." button gets squished when the elements fill the scrollable area (making it scrollable). i think it's height is not set properly or something?

also, currently im forced to have at least 1 chapter selected at all times, but i want to be able to select none. while none are selected, the "start" button should be disabled

on mobile, there is the section with the input and the keyboard, which looks like it's on a resizeable floating area (with the grabbable bar at the top of the area) which i like. only, this resize stuff isn't working. i want it to work like the menu of google maps, where there are 2 states where you can drag it to and it smoothly animates to those heights, based on where you let it go. at the bottom, with only the grabbable bar visible, or up so you can see the whole input, the (new and trimmed down) keyboard and the conficence+submit buttons.

also, i dont really get the "where you stand" page anymore? like, is it currently only showing/comparing times? i also (primarily actually) want it to show how much of each type i get right/wrong. like in the mockup i made.

and are the "study next" and "then build speed" cards implemented? because i dont see them but that could just be because i dont have enough data yet (given that i only did a few tasks just to have some data to be shown)
- on that note, i want you to add some test data (just like in the mockup), so i can easily see and test and give feedback.

some points on the option to write latex in the canvas:
- when i type latex in that input at the bottom, i want the preview to pop up above that input, so i can view it while typing. then, i also want a second box that shows the exact same preview (that's the box we already have) but i just want to be able to drag that around. and as soon as i type something in the input, i want that floating box to stay present (so basically, get rid of the checkmark and x buttons while typing, because it has to stay anyway) (the only button that stays, is the trash button, which should always be visible when that element is focussed (so with a yellow line around it))
- when i press on any floating latex element, it's raw latex should be in the input so i can edit them after the fact.