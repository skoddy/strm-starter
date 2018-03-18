import { Component, OnInit, ViewChild, Inject } from '@angular/core';
import { PostsListService } from '@app/features/posts/posts.service';
import { interval } from 'rxjs/observable/interval';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Subscription } from 'rxjs/Subscription';
import { AuthService, DatabaseService } from '@app/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material';
import { AngularFirestore } from 'angularfire2/firestore';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import * as faker from 'faker';
import { Author, Post } from '@app/data-model';

@Component({
  selector: 'app-post-list',
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.scss'],
})

export class PostsListComponent implements OnInit {

  unsubscribe: Subscription;
  mouseOverTimer: any;
  animal: string;
  name: string;
  categories = [
    'Programmierung',
    'Netzwerke',
    'Prüfung',
    'Sonstiges'
  ];
  constructor(
    public posts: PostsListService,
    public auth: AuthService,
    public dialog: MatDialog,
    private db: DatabaseService,
    private afs: AngularFirestore) {
    this.posts.init('posts', 'createdAt');
  }
  ngOnInit() {
    window.addEventListener('scroll', this.posts.scroll, true); // third parameter
  }

  // tslint:disable-next-line:use-life-cycle-interface
  ngOnDestroy() {
    window.removeEventListener('scroll', this.posts.scroll, true);
    // reset data
    this.unsubscribe = this.posts.data.subscribe();
    this.posts._data = new BehaviorSubject([]);
    this.unsubscribe.unsubscribe();
    console.log('destroyed');
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(NewPostDialogComponent, {
      backdropClass: 'myBackdrop',
      maxWidth: 'none',
      width: '100vw',
      height: '100vh',
      data: { name: this.name, animal: this.animal }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
      this.animal = result;
      if (result) {
        console.log('with result' + result.category);
        console.log('with result' + result.content);
        this.newPost(result.category, result.content);
      }
    });
  }

  newPost(category: string, content: string) {
    const newPostId = this.db.getNewKey('posts');
    const date = new Date();
    const authorData: Author = {
      uid: this.auth.uid,
      displayName: this.auth.displayName,
      photoURL: this.auth.photoURL
    };

    const postData: Post = {
      createdAt: new Date(),
      category: category,
      content: this.strip_html_tags(content),
      author: authorData
    };

    this.add(postData, newPostId).then(() =>
      console.log('data saved')
    );
  }

  add(data, id) {
    return this.afs.collection('posts').doc(id).set(data);
  }

  strip_html_tags(str) {
    if ((str === null) || (str === '')) {
      return false;
    } else {
      str = str.toString();
    }
    return str.replace(/<[^>]*>/g, '');
  }
  addRandom() {
    const newPostId = this.db.getNewKey('posts');
    const date = new Date();
    const authorData: Author = {
      uid: faker.random.alphaNumeric(16),
      displayName: faker.name.findName(),
      photoURL: faker.internet.avatar(),
    };

    const postData: Post = {
      createdAt: date,
      category: this.getRandomItem(this.categories),
      content: faker.lorem.sentences(25),
      author: authorData
    };

    this.add(postData, newPostId).then(() =>
      console.log('data saved')
    );
  }


  getRandomItem(arr) {
    console.log(arr);
    return arr[Math.floor(Math.random() * arr.length)];
  }
  more() {
    this.posts.more();
  }

  onHovering(e) {
    const source = interval(500).take(1);
    this.mouseOverTimer = source.subscribe(val => {
      e.target.classList.remove('mat-elevation-z2');
      e.target.className = e.target.className.concat(' mat-elevation-z8 ');
    });
  }

  onUnovering(e) {
    this.mouseOverTimer.unsubscribe();
    e.target.classList.remove('mat-elevation-z8');
    e.target.className = e.target.className.concat(' mat-elevation-z2 ');
  }
}

@Component({
  selector: 'app-new-post-dialog',
  templateUrl: 'new-post-dialog.html',
  styleUrls: ['./post-list.component.scss'],
})

export class NewPostDialogComponent {
  content: string;
  category: string;

  constructor(
    private auth: AuthService,
    public router: Router,
    private location: Location,
    public dialogRef: MatDialogRef<NewPostDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  onNoClick(): void {
    this.dialogRef.close();
  }
  fillForm() {
    this.data.category = 'Netzwerke';
    this.data.content = faker.lorem.sentences(10);
  }
  back() {
    this.location.back();
  }

}
