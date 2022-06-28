//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2022  Interneuron CIC

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 
import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { SubjectsService } from 'src/app/services/subjects.service';

@Component({
  selector: 'app-nursing-instruction',
  templateUrl: './nursing-instruction.component.html',
  styleUrls: ['./nursing-instruction.component.css']
})
export class NursingInstructionComponent implements OnInit {

  // showNursingInstruction: boolean = false;
  subscriptions = new Subscription();
  endorsement: any[];
  medusaInstruction: any[];
  @Input('event') event: any

  constructor(public subjects: SubjectsService) {

  }

  ngOnInit(): void {
    this.init(this.event);
  }
  init(event: any) {
    // this.showNursingInstruction = true;
    this.endorsement = event.filter(e => e.category == "Endorsement");
    this.medusaInstruction = event.filter(e => e.category == "Medusa Instructions");
  }
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  closeNursingInstructionPopup() {
    // this.showNursingInstruction = false;
    this.subjects.closeAppComponentPopover.next();
  }
}
