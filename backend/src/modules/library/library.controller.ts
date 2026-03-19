import { Controller, Get, Query } from '@nestjs/common';
import { LibraryService } from './library.service';
import { SearchGamesDto } from './dto/search-games.dto';

@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('search')
  search(@Query() searchDto: SearchGamesDto) {
    return this.libraryService.search(searchDto);
  }

  @Get('popular')
  getPopular() {
    return this.libraryService.getPopular();
  }

  @Get('top-rated')
  getTopRated() {
    return this.libraryService.getTopRated();
  }

  @Get('recent')
  getRecent() {
    return this.libraryService.getRecent();
  }
}