//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

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
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ 
    name: 'parseUrl',
    pure: false
})

export class ParseUrlPipe implements PipeTransform {

	urls: any = /(\b(https?|http|ftp|ftps|Https|rtsp|Rtsp|www):\/\/[A-Z0-9+&@#\/%?=~_|!:,.;-]*[-A-Z0-9+&@#\/%=~_|])/gim; // Find/Replace URL's in text	
	hashtags: any = /(^|\s)(#[a-z\d][\w-]*)/ig; // Find/Replace #hashtags in text	
	mentions: any = /(^|\s)(@[a-z\d][\w-]*)/ig; // Find/Replace @Handle/Mentions in text	
	emails: any = /(\S+@\S+\.\S+)/gim; // Find/Replace email addresses in text
     
  transform(text: string) {
    return this.parseUrl(text);
  }

  private parseUrl(text: string) {
    // Find/Replace URL's in text
    if (text.match(this.urls)) {
        text = text.replace(this.urls, function replacer($1, $2, $3) {
            let url: any = $1;
            let urlClean: any = url.replace("" + $3 + "://", "");

            return "<a href=\"" + url + "\" target=\"_blank\">" + urlClean + "</a>";
        });
    }
    
    // Find/Replace @Handle/Mentions in text
    if (text.match(this.hashtags)) {
      text = text.replace(this.hashtags, "<a href=\"/search/hashtag/$2\" class=\"hashtag-link\">$1$2</a>");
    }

    // Find/Replace #hashtags in text
    if (text.match(this.mentions)) {
      text = text.replace(this.mentions, "<a href=\"/search/handle/$2\" class=\"handle-link\">$1$2</a>");
    }

    // Find/Replace email addresses in text
    if (text.match(this.emails)) {
        text = text.replace(this.emails, "<a href=\"mailto:$1\">$1</a>");
    }

    return text;
  }  
}